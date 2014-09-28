brewbox.factory('RecipeScraper', function($http, ParseService, $q, $state, $ionicLoading ) {

        var BrewtoadID = "39308"

        var _retrieveBrewtoadRecipeList = function() { 

                recipesToAdd = []
                brewtoadRecipeCount = 0

                getBrewtoadList = function () {     

                        $ionicLoading.show({ template: 'Retrieving List of Brewtoad Recipes' })

                        $http({method: 'GET', url: "http://mptoolbox.herokuapp.com/scrape/https/www.brewtoad.com/users/" + BrewtoadID+ "/recipes" })
                        .error(function() { getBrewtoadList() })
                        .success(function(r) {                                                                                
                                count = decodeURI(r.result)
                                count = count.substr(0, count.indexOf(' Recipes</strong></li>'))
                                count = count.substr(count.lastIndexOf(">")+1)
                                count.to_i

                                if(count>brewtoadRecipeCount) { brewtoadRecipeCount=count }

                                recipesOnPage=decodeURI(r.result)
                                recipesOnPage=recipesOnPage.substr(recipesOnPage.indexOf('<li class="recipe-container">'))

                                angular.forEach(recipesOnPage.split('<li class="recipe-container">'), function(recipe) {
                                        newRecipe={}
                                        newRecipe.reference = recipe.substring(recipe.indexOf('recipes/')+8)
                                        newRecipe.reference = newRecipe.reference.substring(0, newRecipe.reference.indexOf('" class'))

                                        newRecipe.name = recipe.substring(recipe.indexOf('class="name">')+13)
                                        newRecipe.name = newRecipe.name.substring(0, newRecipe.name.indexOf("</span>"))

                                        newRecipe.style = recipe.substring(recipe.indexOf('class="style">')+14)
                                        newRecipe.style = newRecipe.style.substring(0, newRecipe.style.indexOf("</span>"))

                                        exists=false
                                        angular.forEach(recipesToAdd, function(toAdd) {
                                                if (toAdd.reference == newRecipe.reference) { exists=true}
                                        })

                                        if (!exists && newRecipe.reference!="") { recipesToAdd.push(newRecipe) }
                                })

                                console.log(recipesToAdd.length + " recipes found")

                                if (recipesToAdd.length == brewtoadRecipeCount) {                                                
                                        $ionicLoading.hide();
                                        _updateParseRecipes(recipesToAdd)
                                } else {
                                        getBrewtoadList();
                                }                                         

                        })

                }


                getBrewtoadList();

        }

        var _updateParseRecipes = function (recipesToAdd) {

                $ionicLoading.show({ template: 'Updating Parse Database' })

                parseRecipes=[]
                var getParseRecipes=function() {
                        (new Parse.Query("Recipe"))
                        .find().then(function(r) {
                                parseRecipes=r;
                                deleteRemovedRecipes()
                        })
                }

                var deleteRemovedRecipes = function () {

                        angular.forEach(parseRecipes, function(parseRecipe) {

                                isFound=false

                                angular.forEach(recipesToAdd, function (recipeToAdd) {
                                        if (parseRecipe.get("reference")==recipeToAdd.reference) { isFound=true }
                                })

                                if (!isFound) { 
                                        console.log("Removed " + parseRecipe.get("name"))
                                        parseRecipe.destroy() 
                                }

                        })

                        findAddedRecipes()
                }

                recipesToScrape = []
                var findAddedRecipes = function () {
                        angular.forEach(recipesToAdd,function(recipeToAdd) {

                                alreadyExists=false

                                angular.forEach(parseRecipes, function(parseRecipe) {
                                        if(parseRecipe.get("reference") == recipeToAdd.reference) { alreadyExists=true }
                                })

                                if (!alreadyExists) { recipesToScrape.push(recipeToAdd) }

                        }) 

                        insertAddedRecipes()

                }

                addedRecipeIndex=-1
                var insertAddedRecipes = function() {

                        addedRecipeIndex++

                        if (addedRecipeIndex==recipesToScrape.length) {
                                $ionicLoading.hide()
                                console.log("done")
                                return _retrieveRecipeDetails(recipesToScrape);
                        } else {
                                (new (Parse.Object.extend("Recipe")))
                                .save({ 
                                        reference: recipesToScrape[addedRecipeIndex].reference,
                                        name: recipesToScrape[addedRecipeIndex].name,
                                        style: recipesToScrape[addedRecipeIndex].style
                                }).then(function(r) {
                                        console.log("added " + recipesToScrape[addedRecipeIndex].name)
                                        recipesToScrape[addedRecipeIndex]=r
                                        insertAddedRecipes()                                        
                                }) 
                        }

                }

                getParseRecipes()                

        }

        var _retrieveRecipeDetails = function (recipesToScrape) {

                recipeIndex=-1

                ingredientsToAdd=[]

                var scrapeRecipe=function() {                                                

                        recipeIndex++

                        if (recipeIndex==recipesToScrape.length) {
                                $ionicLoading.hide()                                
                                _updateIngredientsList(ingredientsToAdd)
                                return
                        }

                        $ionicLoading.show({ template: 'Scraping Recipe Details: ' + (recipeIndex+1) + "/" + recipesToScrape.length })

                        $http({method: 'GET', url: "http://mptoolbox.herokuapp.com/scrape/https/www.brewtoad.com/recipes/" + recipesToScrape[recipeIndex].get("reference")  })
                        .error(function() { scrapeRecipe() })
                        .success(function (result) {

                                recipeProfile={ ingredients: {} }

                                result = decodeURI(result.result).replace(/(\r\n|\n|\r)/gm,"")               

                                //GET BATCH SIZE
                                recipeProfile.batchSize = result.substring(result.indexOf("Batch Size")+19)
                                recipeProfile.batchSize = parseFloat(recipeProfile.batchSize.substring(0, recipeProfile.batchSize.indexOf("L")))
                                
                                //GET BOIL TIME
                                recipeProfile.boilTime = result.substring(result.indexOf("Boil Time")+18)
                                recipeProfile.boilTime = parseFloat(recipeProfile.boilTime.substring(0, recipeProfile.boilTime.indexOf(" min")))
                                
                                //SPLIT TABLES
                                result = result.substring(result.indexOf("<table")+6)  
                                tables={}

                                //WITH EACH TABLE
                                angular.forEach(result.split("<table"), function(table) {
                                        //SPLIT TABLE                                        
                                        table=table.match(/id='(.*?)'>.*<thead><tr>(.*?)<\/tr><\/thead><tbody>(.*?)<\/tbody>/)

                                        //EXTRACT TITLE + GENERATE REFERENCE OBJECT
                                        target=(tables[table[1]]=[])

                                        //EXTRACT HEADER TITLES					
                                        headers = table[2].toLowerCase()
                                        .replace(/<\/th>/g,"#")
                                        .replace(/<[^>]*>/g, "")
                                        .replace(/#$/,"")
                                        .split("#")
                                        headers[0]="name"

                                        //CYCLE THROUGH ROWS AND EXTRACT DATA     
                                        table[3] = table[3].replace(/<\/tr>/g,"NEWROW")
                                        .replace(/<\/td>/g,"NEWCELL")
                                        .replace(/<[^>]*>/g, "")
                                        .replace(/NEWCELLNEWROW$/,"")

                                        angular.forEach(table[3].split("NEWROW"),function(row){
                                                rowData={}
                                                angular.forEach(row.split("NEWCELL"),function(cell, index) {
                                                        if(/ kg/.test(cell)) {
                                                                cell = parseFloat(cell) * 1000 
                                                        } else if(/\sg|[0...9]g|\smin|°C/.test(cell)) {
                                                                cell = parseFloat(cell)*1
                                                        }

                                                        rowData[headers[index]]=cell
                                                })
                                                target.push(rowData)
                                        })

                                })

                                //COMPILE RECIPE PROFILE
                                recipeProfile.ingredients = {
                                        fermentable: tables.fermentables,
                                        hop: tables.hops,
                                        yeast: tables.yeasts
                                }                    
                                recipeProfile.mash_steps = tables.mash_steps

                                err=""
                                if(recipeProfile.ingredients.fermentable===undefined) { err=err+"- No fermentables are defined\n"}
                                if(recipeProfile.ingredients.hop===undefined) { err=err+"- No hops are defined\n"}
                                if(recipeProfile.ingredients.yeast===undefined) { err=err+"- No yeast is defined\n"}
                                if(recipeProfile.mash_steps===undefined) { err=err+"- No mash steps are defined\n"}

                                if (err) { alert("The recipe for " +recipesToScrape[recipeIndex].get("name")+ " was incomplete:\n"+err) }

                                for(ingredientType in recipeProfile.ingredients) {
                                        recipeProfile['total_'+ingredientType]=0
                                        angular.forEach(recipeProfile.ingredients[ingredientType], function(ingredient) {
                                               recipeProfile['total_'+ingredientType]+=ingredient.amount||1
                                        })
                                }

                                //ADD INGREDIENTS TO QUEUE
                                ingredientsToAdd.push(recipeProfile.ingredients)

                                //SAVE RECIPE PROFILE
                                recipesToScrape[recipeIndex].set("profile", recipeProfile)
                                recipesToScrape[recipeIndex].save().then(scrapeRecipe)

                        })


                }

                scrapeRecipe();

        }

        var _updateIngredientsList = function (ingredientsToAdd) {

                //SANITISE INPUT INGREDIENTs
                newList = []
                angular.forEach(ingredientsToAdd, function(recipe) {
                        for(type in recipe) {
                                angular.forEach(recipe[type], function(item) {
                                        isNew=true
                                        angular.forEach(newList, function(newListItem) {                                                        
                                                if(newListItem.name==item.name && newListItem.type==type) {
                                                        isNew=false
                                                }
                                        })
                                        if(isNew) {newList.push({type:type, name:item.name})}
                                })
                        } 
                })        
                ingredientsToAdd=newList

                //ADD INGREDIENTS
                ingredientIndex = -1

                addIngredient = function () {

                        ingredientIndex++
                        if (ingredientIndex==ingredientsToAdd.length) {
                                console.log("done");
                                $ionicLoading.hide();
                                $state.go($state.$current, null, { reload: true });
                                return;
                        }

                        $ionicLoading.show({ template: 'Updating Ingredients: ' + (ingredientIndex+1) + "/" + (ingredientsToAdd.length) });                        

                        (new Parse.Query("Ingredient"))
                        .equalTo("type", ingredientsToAdd[ingredientIndex].type)
                        .equalTo("name", ingredientsToAdd[ingredientIndex].name)
                        .find().then(function(result) {
                                if (result.length==0) {
                                        (new (Parse.Object.extend("Ingredient")))
                                        .save({ 
                                                type:ingredientsToAdd[ingredientIndex].type,
                                                name:ingredientsToAdd[ingredientIndex].name
                                        }).then(function(r) {
                                                addIngredient();
                                        }) 
                                } else {
                                        addIngredient()
                                }
                        })                        			                                               

                }
                addIngredient();


        }

        return {

                retrieveBrewtoadRecipeList: function() { _retrieveBrewtoadRecipeList() },

                retrieveRecipeDetails: function(recipesToScrape) { _retrieveRecipeDetails(recipesToScrape) },

                regulariseRecipe:function(recipeProfile, overrideAutoCollate){

                        //SANITISE INPUT INGREDIENTs
                        var ingredientList = []

                        for(type in recipeProfile.ingredients) {
                                angular.forEach(recipeProfile.ingredients[type], function(ingredient) {

                                        exists=false;
                                        if (!overrideAutoCollate) {
                                                angular.forEach(ingredientList, function(existingItem,index) {
                                                        if (existingItem.name==ingredient.name && existingItem.type == type) {exists=index};
                                                })       
                                        }

                                        if (exists) { 
                                                ingredientList[exists].amount=ingredientList[exists].amount+ingredient.amount
                                        } else { 
                                                ingredientList.push({ type:type, name:ingredient.name, amount:ingredient.amount || 1 })
                                        }
                                })
                        }


                        return $q.all(ingredientList.map(function(item, index) {
                                return (new Parse.Query("Ingredient"))
                                .equalTo("type", item.type)
                                .equalTo("name", item.name)
                                .include("parent")
                                .find().then(function(result) {
                                        r=result[0].get("parent") || result[0];
                                        r.set("amount", ingredientList[index].amount)
                                        return r 
                                });
                        }));


                }


        }

});

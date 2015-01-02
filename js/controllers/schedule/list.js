brewbox.controller('ListSchedule', function($scope, $state, $stateParams, $q, ParseService, RecipeScraper) { 

        $scope.brewdays=[]
        $scope.shoppingList=[]
        $scope.listdate = $stateParams.listdate ? moment($stateParams.listdate).add(1, 'hours') : null

        $scope.moment=moment

        $scope.getSchedule = function(type) {
                $scope.selectedType=type

                s=new Parse.Query(Parse.Object.extend("Brewday")).descending("date").include("recipe")   

                if($scope.selectedType=="Future") {
                        s.greaterThan("date", new Date())
                } else {
                        s.lessThan("date", new Date())
                }

                s.find().then(function(result) {                                                                       
                        $scope.brewdays=result
                        if ($scope.selectedType=="Future") { checkIngredients()}
                        $scope.$apply();
                })

        }
        $scope.getSchedule("Future")       

        checkIngredients = function() {

                cumulativeAmounts=[]
                promises=[]

                $scope.brewdays.forEach(function(brewday, index){
                        brewday.ingredientsOnHand=0
                        cumulativeAmounts[index]=[]
                        promises.push(RecipeScraper.regulariseRecipe(brewday.get('recipe').get('profile')).then(function(regularisedRecipe){
                                regularisedRecipe.forEach(function(ingredient) {
                                        cumulativeAmounts[index].push({
                                                'name': ingredient.get("name"),
                                                'amount': ingredient.get("amount"),
                                                'onHand': ingredient.get("onHand")
                                        })                                       
                                })                                                               
                        }))
                })

                $q.all(promises).then(function() {

                        cumulativeAmounts.reverse()
                        $scope.brewdays.reverse();

                        cumulativeAmounts.forEach(function(recipe, recipeIndex) {
                                $scope.brewdays[recipeIndex].ingredientsOnHand=1
                                recipe.forEach(function(ingredient, ingredientIndex) {
                                        ingredient.cumulativeAmount=ingredient.amount
                                        cumulativeAmounts.forEach(function(r,ri) {
                                                r.forEach(function(i,ii){
                                                        if(i.name==ingredient.name && ri<recipeIndex) { ingredient.cumulativeAmount=ingredient.cumulativeAmount+i.amount }
                                                })                                                
                                        })
                                        ingredient.onHand = ingredient.onHand || 0
                                        if(ingredient.cumulativeAmount>ingredient.onHand) { $scope.brewdays[recipeIndex].ingredientsOnHand=-1 }
                                })
                                $scope.brewdays[recipeIndex].cumulativeIngredients = recipe  

                                if ($scope.listdate  && moment($scope.brewdays[recipeIndex].get("date")).isBefore($scope.listdate)) { pushShoppingListIngredients(recipe) }
                        })

                        $scope.brewdays.reverse();                              
                })               
        }

        pushShoppingListIngredients = function (recipe) {
                recipe.forEach(function(ingredient) {

                        isfound=false

                        $scope.shoppingList.forEach(function(existingIngredient) {
                                if(existingIngredient.name==ingredient.name) {

                                        existingIngredient.amount+=ingredient.amount

                                        isfound=true
                                }
                        })

                        if (!isfound) {$scope.shoppingList.push({name:ingredient.name, amount: ingredient.amount - ingredient.onHand})}

                })
        }

        $scope.onlyItemsAboveZero = function(i) {
                if (i.amount>0) { return true; }
                return false;
        }

        $scope.addIngredient = function(i) {
                if(amount=prompt("Add how much?")) {
                        new Parse.Query(Parse.Object.extend("Ingredient"))
                        .equalTo("name", i.name)
                        .find().then(function(result) {
                                result=result[0]
                                result.set("onHand", result.get("onHand") + parseInt(amount)).save().then(function () {
                                        i.amount-=amount
                                })
                        })
                }
        }

        $scope.getShoppingList = function(index) {               
                console.log($scope.brewdays[index].get("date"))
                $state.go("ui.shoppingList", {listdate: $scope.brewdays[index].get("date")})
        }       


});
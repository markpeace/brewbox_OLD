brewbox.controller('ListSchedule', function($scope, $state, $q, ParseService, RecipeScraper) { 

        $scope.brewdays=[]

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
                                        if(ingredient.cumulativeAmount>ingredient.onHand) { $scope.brewdays[recipeIndex].ingredientsOnHand=-1 }
                                })
                                $scope.brewdays[recipeIndex].cumulativeIngredients = recipe                                
                        })
                        
                        $scope.brewdays.reverse();                        
                })               
        }

        $scope.getShoppingList = function(index) {
                $scope.brewdays[index].set("shoppingData", $scope.brewdays[index].cumulativeIngredients).save().then(function() {
                        $state.go("ui.shoppingList", {id: $scope.brewdays[index].id})
                })
        }       


});
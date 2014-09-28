brewbox.controller('RecipeProfile', function($scope, $stateParams, $ionicModal,RecipeScraper) { 


        $scope.moment=moment
        $scope.regularisedRecipe=[]               
        
        getRecipe = function() {

                $scope.selectedID=$stateParams.recipe_id
                new Parse.Query(Parse.Object.extend("Recipe"))
                .get($scope.selectedID).then(function(result) {
                        $scope.recipe = result
                        $scope.recipe.regularisedRecipe=[1,2]
                        
			RecipeScraper.regulariseRecipe(result.get("profile")).then(function(result) {
                                $scope.regularisedRecipe=result
                        })
                        
                        getBrewdays()
                })

        }
        
        $scope.brewdays=[]
        getBrewdays = function () {
                new Parse.Query(Parse.Object.extend("Brewday"))
                .equalTo("recipe", $scope.recipe)
                .descending("date")
                .find().then(function (result) {
                        $scope.brewdays=result                        
                        $scope.$apply()
                })

        }


        if ($stateParams.recipe_id) getRecipe()


        $ionicModal.fromTemplateUrl('pages/schedule/new.html', function($ionicModal) {
                $scope.newBrewday = $ionicModal;
        }, {
                scope: $scope,
                animation: 'slide-in-up'
        });   

        $scope.newBrewdayDate = {date: (moment(new Date()).add('days', 1).utc().hour(10).minute(00)._d)}

        $scope.saveBrewday = function () {
                
                var brewday = new (Parse.Object.extend("Brewday"))().save({
                        date:moment($scope.newBrewdayDate.date)._d,
                        recipe: $scope.recipe
                }).then(function(result) {

                        $scope.recipe.relation("brewdays").add(result)
                        $scope.recipe.save().then(function() {
                                getRecipe()
                                $scope.newBrewday.hide()  
                        })

                });

        }
        
        $scope.refreshIngredients = function () {
                RecipeScraper.retrieveRecipeDetails([$scope.recipe])
        }
        
      
        
});
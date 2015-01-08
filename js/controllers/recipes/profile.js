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
                $scope.newBrewdayPopup = $ionicModal;
        }, {
                scope: $scope,
                animation: 'slide-in-up'
        });   
        
        $scope.newBrewday={}
        $scope.newBrewday.Date = moment(new Date()).add('days', 1).format("YYYY-MM-DD")
        $scope.newBrewday.Time = "10:00"

        $scope.saveBrewday = function () {
                
                var brewday = new (Parse.Object.extend("Brewday"))().save({
                        date:moment($scope.newBrewday.Date+"T"+$scope.newBrewday.Time+"Z")._d,
                        recipe: $scope.recipe
                }).then(function(result) {

                        $scope.recipe.relation("brewdays").add(result)
                        $scope.recipe.save().then(function() {
                                getRecipe()
                                $scope.newBrewdayPopup.hide()  
                        })

                });

        }

        $scope.refreshIngredients = function () {
                RecipeScraper.retrieveRecipeDetails([$scope.recipe])
        }



});
brewbox.controller('IngredientProfile', function($scope, $state, ParseService, $stateParams) { 

        getIngredient = function() {

                new Parse.Query(Parse.Object.extend("Ingredient"))
                .include("parent")
                .get($scope.selectedID).then(function(result) {
                        $scope.ingredient = result
                        if ($scope.ingredient.get('childCount')) {
                        	getChildren()
                        } else if (!$scope.ingredient.get('parent')) {                        
                                getAllIngredients()
                        }
                                
                })

        }

        getAllIngredients = function () {
                new Parse.Query(Parse.Object.extend("Ingredient"))
                .equalTo("type", $scope.ingredient.get("type"))
                .notEqualTo("name", $scope.ingredient.get("name"))
                .equalTo("parent", null)
                .ascending("name")
                .find().then(function(result) {
                        $scope.ingredients = result
                        $scope.$apply()	                               
                })
        }

        
	getChildren = function () {
                $scope.ingredient.relation("children").query().find().then(function (result) {
                        $scope.ingredientChildren = result
                })
        }        

        if($stateParams.ingredient_id) {
                $scope.selectedID=$stateParams.ingredient_id;
                getIngredient();
        }

        $scope.setParent = function (parent) {            

                if (parent=="addone") {
                        if (newIngredient=prompt("Name of New Ingredient")) {
                                (new (Parse.Object.extend("Ingredient")))
                                .save({ name: newIngredient, type: $scope.ingredient.get('type')
                                      }).then(function(result){

                                        result.relation("children").add($scope.ingredient)
                                        result.set("childCount", 1)
                                        result.save()

                                        $scope.ingredient.set("parent", result).save().then(function() {
                                                $state.go($state.$current, null, { reload: true });
                                        })
                                })
                        }                                
                } else if (parent==null) {

                        $scope.ingredient.get('parent').relation("children").remove($scope.ingredient)
                        $scope.ingredient.get('parent').set("childCount", $scope.ingredient.get('parent').get("childCount")-1)
                        $scope.ingredient.get('parent').save()
                        $scope.ingredient.set("parent", null).save().then(function() {
                                $state.go($state.$current, null, { reload: true });
                        })

                } else {  

                        new Parse.Query(Parse.Object.extend("Ingredient"))
                        .get(parent).then(function (parent) {
                                parent.relation("children").add($scope.ingredient)
                                parent.set("childCount", 1 + (parent.get("childCount") || 0))
                                console.log( parent.get("childCount"))
                                parent.save()
                                $scope.ingredient.set("parent", parent).save().then(function () {
                                        $state.go($state.$current, null, { reload: true });
                                })
                        })

                }
        }
        
        $scope.processOnhand = function (rawVal) {
                if(!rawVal) {
                        return ""
                } else if(rawVal>999) {
                        return (rawVal/1000)+"kg"
                } else {
                        return (rawVal)+"g"
                }
        }
        
        $scope.setOnHand = function () {
                amount=prompt("Enter Amount on Hand:")
                console.log(amount)
                $scope.ingredient.set("onHand", parseFloat(amount)).save().then(function(r){
                        $state.go($state.$current, null, { reload: true });
                })
        }

}) 
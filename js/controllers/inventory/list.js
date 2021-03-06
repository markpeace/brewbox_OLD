brewbox.controller('ListInventory', function($scope, HardwareInterface, $stateParams, $state, RecipeScraper, $ionicSideMenuDelegate) { 

        if ($stateParams.ingredient_id) { 
                $scope.selectedID=$stateParams.ingredient_id;
                $ionicSideMenuDelegate.toggleRight();           //      <-- This was causing problems, probably an Ionic version bug
        }         

        var getInventory = function () {
                (new Parse.Query("Ingredient"))
                .equalTo("typeOf", null)
                .equalTo("parent", null)
                .ascending("name")
                .find().then(function (result) {
                        $scope.inventory = result

                        $scope.types = []
                        angular.forEach($scope.inventory, function(i) {
                                var exists=false
                                angular.forEach($scope.types, function (t) {
                                        if(t==i.get('type')) { exists=true }										
                                })
                                if (!exists) { $scope.types.push(i.get("type")) }
                        })

                        if ($scope.selectedID) {
                                (new Parse.Query("Ingredient"))
                                .get($scope.selectedID).then(function(result){                                        
                                        $scope.selectedType=result.get("type")
                                })
                        } else {
                                $scope.selectedType=$scope.types[0]
                        }


                })
        }
        getInventory();

        $scope.processOnhand = function (rawVal) {
                if(!rawVal) {
                        return ""
                } else if(rawVal>999) {
                        return (rawVal/1000)+"kg"
                } else {
                        return (rawVal)+"g"
                }
        }

});
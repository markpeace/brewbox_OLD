brewbox.controller('ShoppingList', function($scope, $state, $stateParams, ParseService, RecipeScraper) { 

        (new Parse.Query("Brewday"))
        .get($stateParams.id).then(function(brewday) {
                console.log(brewday.get("shoppingData"))
        })

});
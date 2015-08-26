brewbox.controller('Splash', function($scope, $state) { 

        console.log("splash")
        
        dateSelect = new Parse.Query(Parse.Object.extend("Brewday"))
        .greaterThan("date", moment().subtract("days",1).toDate())       
        .lessThan("date", moment().add("days",2).toDate())

        activeSelect = new Parse.Query("Brewday")        
        .equalTo("active", "true")

        new Parse.Query.or(dateSelect, activeSelect)        
        .ascending("date")
        .limit(1)
        .find().then(function(result){
                if (result.length>0) {
                        $state.go("ui.brewday", {id: result[0].id})
                }
        })       
});
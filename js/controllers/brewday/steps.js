brewbox.controller('Steps', function($scope, HardwareInterface, $stateParams, $state, RecipeScraper, $ionicListDelegate) { 


        HardwareInterface.requestQueue.push({ port: 200, command: "HLT SET VOL 35" })
        HardwareInterface.requestQueue.push({ port: 200, command: "HLT SET TEMP 74" })

        var getRecipe = function () {

                (new Parse.Query("Brewday"))
                .equalTo("objectId", $stateParams.id)
                .include("recipe")          
                .find().then(function(result) {
                        if(result.length==0) {$state.go("ui.splash")}
                        $scope.brewday=result[0]; result=result[0]                                               

                        //if (result[0].get("steps")) { return resumeBrewday() }
                        
                        if(moment(result.get("recipe").updatedAt).isBefore(moment().subtract("minutes", 2))) {
                                RecipeScraper.retrieveRecipeDetails([result.get("recipe")])	                                
                        } else {
                                compileBrewParameters()
                        }

                })

        }
        getRecipe();


        var compileBrewParameters = function () {

                recipe=$scope.brewday.get("recipe").get("profile")

                brewParameters={                        

                        // VARIABLES WHICH CHANGE DEPENDING ON THE RECIPE
                        MSH_grain_weight: recipe.total_fermentable/1000,     			// in kg
                        MSH_temperature: recipe.mash_steps[0]['target temp'],       		// in C
                        MSH_thickness: 2.75,       						// in l/kg
                        MSH_time: recipe.mash_steps[0]['time'],              			// in mins
                        MSH_mashout_temp: 75,      						// in C
                        FMT_volume: recipe.batchSize,       					// in l

                        CPR_hop_weight: recipe.total_hop,				       // in g
                        CPR_boiltime: recipe.boilTime,	        			          // in mins


                        // EQUIPMENT PROFILE
                        HLT_deadspace: 1,          // in l
                        HLT_groundwater_temp:10,   // in c
                        HLT_minimum_volume: 20,    // in l - without this, the heat coil wouldn't work
                        MSH_deadspace: 2,          // in l
                        MSH_ambient_temp: 15,      // in c
                        CPR_deadspace: 2,          // in l
                        CPR_evaporationrate: 16,   // in %
                        CPR_shrinkage: 4,          // in %
                }

                calculateParameters(brewParameters)                       

        }

        calculateParameters=function(brewParameters) {
                me = brewParameters

                //CALCULATE BOIL VOLUME

                me.CPR_preboil_volume =
                        me.FMT_volume +
                        ((me.FMT_volume * (me.CPR_evaporationrate/100)) * (me.CPR_boiltime/60)) +
                        ((me.CPR_hop_weight/100)*1.5) +               
                        (me.FMT_volume * (me.CPR_shrinkage/100)) + 
                        me.CPR_deadspace                                                         


                //CALCULATE MASH VOLUMES                
                me.MSH_first_water_volume =
                        me.MSH_grain_weight * me.MSH_thickness +
                        me.MSH_deadspace

                me.MSH_first_runoff_volume =
                        me.MSH_first_water_volume - me.MSH_grain_weight

                me.MSH_third_water_volume = me.CPR_preboil_volume - me.MSH_first_runoff_volume

                me.MSH_second_water_volume = (me.MSH_third_water_volume-me.MSH_first_runoff_volume)/2

                me.MSH_third_water_volume = me.MSH_third_water_volume - me.MSH_second_water_volume

                me.MSH_first_runoff_volume = me.MSH_first_runoff_volume + me.MSH_second_water_volume


                //CALCULATE MASH TEMPERATURES
                me.MSH_first_water_temperature = (.41/me.MSH_thickness) * (me.MSH_temperature-me.MSH_ambient_temp) + me.MSH_temperature
                me.MSH_second_water_temperature = me.MSH_mashout_temp                
                me.MSH_third_water_temperature = me.MSH_mashout_temp

                //CALCULATE HLT VOLUMES - UP TO HERE...

                me.HLT_total_water_needed = me.MSH_first_water_volume + me.MSH_second_water_volume + me.MSH_third_water_volume

                me.HLT_first_water_volume = me.HLT_total_water_needed * .95

                if (me.HLT_first_water_volume - me.MSH_first_water_volume < me.HLT_minimum_volume ) {
                        me.HLT_first_water_volume=me.HLT_first_water_volume + (me.HLT_minimum_volume-(me.HLT_first_water_volume - me.MSH_first_water_volume))
                }

                me.HLT_volume_after_strike = me.HLT_first_water_volume - me.MSH_first_water_volume

                me.HLT_second_water_volume = 
                        (me.MSH_first_water_temperature-me.MSH_temperature)/
                        (me.MSH_first_water_temperature-((me.HLT_volume_after_strike * me.MSH_first_water_temperature) + (1 * me.HLT_groundwater_temp)) / 
                         (me.HLT_volume_after_strike+1))


                me.HLT_volume_after_second_addition = me.HLT_volume_after_strike + me.HLT_second_water_volume

                me.HLT_temperature_after_second_addition =
                        ((me.HLT_volume_after_strike * me.MSH_first_water_temperature) + 
                         (me.HLT_second_water_volume * me.HLT_groundwater_temp)) / 
                        (me.HLT_volume_after_strike+me.HLT_second_water_volume)

                me.HLT_waste_water = me.HLT_volume_after_second_addition - (me.MSH_second_water_volume + me.MSH_third_water_volume)                               

                console.log(me)

                calculateBrewSteps(me)


        }

        $scope.stepFunctions = {
                sf: this,
                activate: function (st) {

                        $ionicListDelegate.closeOptionButtons()

                        st.originalValue = HardwareInterface.hardwareReadings()[st.hardwareReference].readings[st.hardwareVariable]
                        if (st.targetValue<st.originalValue) { st.reverse = true }

                        st.isActive=true;
                        HardwareInterface.requestQueue.push({ port: st.commandPort, command: st.command + st.targetValue })

                        if (!st.continueWithoutCompletion) {
                                st.ping = setInterval(function() {$scope.stepFunctions.updateProgress(st)},HardwareInterface.settings.pulseInterval);   
                                $scope.brewday.set("steps", $scope.brewSteps).save()
                        } else {
                                st.percentageComplete = 100
                                $scope.stepFunctions.deactivate(st)                                
                        }
                },
                updateProgress:function (st) {

                        st.currentValue = HardwareInterface.hardwareReadings()[st.hardwareReference].readings[st.hardwareVariable]

                        st.percentageComplete = (st.currentValue / st.targetValue) * 100       
                        st.subtitle = Math.round(st.currentValue,1) + " / " + Math.round(st.targetValue,1) + st.targetValueUnit

                        if (st.reverse==true) { 

                                st.subtitle = Math.round(st.originalValue - st.currentValue,1) + "/" + Math.round(st.originalValue - st.targetValue,1)

                                st.percentageComplete = ((st.originalValue - st.currentValue)/(st.originalValue - st.targetValue))*100             

                        }



                        if (st.percentageComplete>95) { $scope.stepFunctions.deactivate(st) }                                                           

                },
                deactivate: function (st) {
                        clearInterval(st.ping)                         

                        stepIndex=-1;

                        angular.forEach($scope.brewSteps, function(v,i) {  
                                if (v==st) { stepIndex=i }
                        })

                        if ($scope.brewSteps.length-1>stepIndex) {
                                $scope.brewSteps[stepIndex+1].isCurrent=true

                                switch($scope.brewSteps[stepIndex+1].trigger) {
                                        case "auto":
                                                $scope.stepFunctions.activate($scope.brewSteps[stepIndex+1])
                                                break;
                                }

                        }

                        st.isActive=false
                        st.isCurrent=false

                        $scope.brewday.set("steps", $scope.brewSteps).save()

                }
        }


        calculateBrewSteps = function (brewParameters) {
                steps=[]

                stepTemplate =function () {

                        st=this

                        st.isCurrent=false;
                        st.isActive=false;
                        st.trigger = "user"
                        st.continueWithoutCompletion = false

                        st.commandPort= 200

                        st.currentValue = 12.23                        

                }


                me = brewParameters;

                angular.forEach([
                        { 
                                title: "Prefill HLT",
                                isCurrent: true,
                                command: "HLT SET VOL ",
                                targetValue: me.HLT_first_water_volume,
                                targetValueUnit: "l",
                                hardwareReference: "hlt",
                                hardwareVariable: "vol"
                        },
                        { 
                                title: "Preheat HLT",
                                command: "HLT SET TEMP ",
                                targetValue: me.MSH_first_water_temperature,
                                targetValueUnit: "&deg;C",
                                hardwareReference: "hlt",
                                hardwareVariable: "temp"
                        },
                        { 
                                title: "Transfer Strike Water",
                                command: "HLT SET VOL ",
                                targetValue: me.HLT_first_water_volume-me.MSH_first_water_volume,
                                targetValueUnit: "l",
                                hardwareReference: "hlt",
                                hardwareVariable: "vol"
                        },
                        { 
                                title: "Set HLT to Mash Temperature",
                                trigger:"auto",
                                continueWithoutCompletion:true,
                                command: "HLT SET TEMP ",
                                targetValue: me.MSH_temperature,
                                targetValueUnit: "&deg;C",
                                hardwareReference: "hlt",
                                hardwareVariable: "temp"
                        },
                        { 
                                title: "Top Up HLT",
                                trigger: "auto",
                                command: "HLT SET VOL ",
                                targetValue: me.HLT_second_water_volume + (me.HLT_first_water_volume-me.MSH_first_water_volume),
                                targetValueUnit: "l",
                                hardwareReference: "hlt",
                                hardwareVariable: "vol"
                        },
                        { 
                                title: "Mash Recirculation",
                                command: "MSH PUMP ON",
                                targetValue: 60,
                                targetValueUnit: "seconds",
                                hardwareReference: "msh",
                                hardwareVariable: "pumpActivatedFor"
                        },
                        { 
                                title: "Transfer Second Water Addition",
                                command: "HLT SET VOL ",
                                targetValue: me.HLT_first_water_volume-(me.MSH_first_water_volume+me.HLT_second_water_volume),
                                targetValueUnit: "l",
                                hardwareReference: "hlt",
                                hardwareVariable: "vol"
                        },
                        { 
                                title: "Set HLT to Mash Out Temperature",
                                trigger:"auto",
                                command: "HLT SET TEMP ",
                                targetValue: me.MSH_mashout_temp,
                                targetValueUnit: "&deg;C",
                                hardwareReference: "hlt",
                                hardwareVariable: "temp"
                        },
                        { 
                                title: "Stop Recirculation (tube to copper)",
                                trigger:"auto",
                                continueWithoutCompletion:true,
                                command: "MSH PUMP OFF",
                                targetValue: "",
                                targetValueUnit: "",
                                hardwareReference: "msh",
                                hardwareVariable: "pumpActivatedFor"
                        }

                ], function (step) {
                        newStep = new stepTemplate
                        angular.forEach(step, function(value,key) { newStep[key]=value })
                        steps.push(newStep);        
                })

                $scope.brewday.set("steps", steps).save().then(resumeBrewday)

        }


        resumeBrewday=function () {
                $scope.brewSteps=$scope.brewday.get('steps')   

                angular.forEach($scope.brewSteps, function (step) {
                        if (step.isActive) { $scope.stepFunctions.activate(step) }
                })

                console.log("resumed")
        }        

        //compileBrewParameters();

});
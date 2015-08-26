brewbox.controller('Steps', function($scope, $q, HardwareInterface, $ionicLoading, $stateParams, $state, RecipeScraper, $ionicListDelegate) { 


        //HardwareInterface.requestQueue.push({ port: 151, command: "HLT SET VOL 0" })
        //HardwareInterface.requestQueue.push({ port: 151, command: "HLT SET TEMP 60" })

        var getRecipe = function () {

                (new Parse.Query("Brewday"))
                        .equalTo("objectId", $stateParams.id)
                        .include("recipe")          
                        .find().then(function(result) {

                        if(result.length==0) {$state.go("ui.splash")}
                        $scope.brewday=result[0]; result=result[0]                                               

                        //if (result[0].get("steps")) { return resumeBrewday() }

                        //if(moment(result.get("recipe").updatedAt).isBefore(moment().subtract("minutes", 2))) {
                        //        RecipeScraper.retrieveRecipeDetails([result.get("recipe")])	                                
                        //} else {
                        compileBrewParameters()
                        //}

                })

        }
        getRecipe();


        var compileBrewParameters = function () {

                recipe=$scope.brewday.get("recipe").get("profile")

                brewParameters={                        

                        // VARIABLES WHICH CHANGE DEPENDING ON THE RECIPE
                        MSH_grain_weight: recipe.total_fermentable/1000,     			// in kg
                        MSH_steps: recipe.mash_steps,                               		//                        
                        MSH_thickness: 2.5,       						// in l/kg
                        MSH_mashout_temp: 75,      						// in C
                        FMT_volume: recipe.batchSize,       					// in l
                        CPR_hop_weight: recipe.total_hop,				        // in g
                        CPR_boiltime: recipe.boilTime,                                          // in mins


                        // EQUIPMENT PROFILE
                        HLT_deadspace: 0,          // in l
                        HLT_groundwater_temp:10,   // in c
                        HLT_minimum_volume: 15,    // in l - without this, the heat coil wouldn't work
                        MSH_deadspace: 3,          // in l
                        MSH_ambient_temp: 10,      // in c
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

                //CALCULATE MASH STEPS - NOT ENTIRELY SATISFIED WITH THIS

                me.MSH_total_water = 0
                me.MSH_steps.forEach(function(step,index) {
                        step.thickness = me.MSH_thickness / (me.MSH_steps.length==1 ? 1 : me.MSH_steps.length*.9)                 //Thickness
                        //step.thickness = me.MSH_thickness / me.MSH_steps.length                 //Thickness
                        step.water_volume = me.MSH_grain_weight * step.thickness                //Thickness to water volume
                        if (index==0) step.water_volume+=me.MSH_deadspace                       //Add deadspace is first addition

                        if(index==0) {

                                step.water_temperature = (.41/step.thickness) *
                                        (step['target temp'] - me.MSH_ambient_temp) +
                                        step['target temp']

                        } else {

                                step.water_temperature=76

                                step.water_volume = (step['target temp'] - me.MSH_steps[index-1].water_temperature) *
                                        (.41/me.MSH_grain_weight+me.MSH_total_water) / 
                                        (step.water_temperature - step['target temp'])

                        }

                        me.MSH_total_water += step.water_volume

                })

                //CALCULATE THICKNESS DIFFERENTIALS AND SCALE MASH TIME OF FINAL STEP ACCORDINGLY
                me.MSH_actual_thickness = ((me.MSH_total_water - me.MSH_deadspace) / me.MSH_grain_weight)              
                me.MSH_steps[me.MSH_steps.length-1].time = me.MSH_steps[me.MSH_steps.length-1].time * (me.MSH_actual_thickness / me.MSH_thickness)

                //CALCULATE SPARGE VALUES

                me.MSH_first_runoff_volume = me.MSH_total_water - me.MSH_grain_weight
                me.MSH_total_sparge_water = me.CPR_preboil_volume - me.MSH_first_runoff_volume 

                me.MSH_first_sparge_water = (me.MSH_total_sparge_water - me.MSH_first_runoff_volume) / 2
                if (me.MSH_first_sparge_water<0) me.MSH_first_sparge_water = 0

                me.MSH_first_runoff_volume += me.MSH_first_sparge_water

                me.MSH_second_sparge_water = me.MSH_total_sparge_water - me.MSH_first_sparge_water            

                me.MSH_second_runoff_volume = me.MSH_second_sparge_water


                //CALCULATE HLT VOLUME
                me.HLT_total_water_needed = me.MSH_total_water + me.MSH_first_sparge_water + me.HLT_deadspace +
                        (me.MSH_second_sparge_water+me.HLT_deadspace<me.HLT_minimum_volume ? me.MSH_second_sparge_water : me.HLT_minimum_volume)

                console.log(me)

                calculateBrewSteps(me)


        }

        $scope.stepFunctions = {
                sf: this,
                activate: function (st) {

                        $ionicListDelegate.closeOptionButtons()

                        st.targetValue = eval(st.targetValue)

                        st.originalValue = HardwareInterface.hardwareReadings()[st.hardwareReference].readings[st.hardwareVariable]
                        if (st.targetValue<st.originalValue) { st.reverse = true }

                        st.isActive=true;
                        if (st.command) HardwareInterface.requestQueue.push({ port: st.commandPort, command: st.command + st.targetValue })

                        if (!st.continueWithoutCompletion) {
                                st.ping = setInterval(function() {$scope.stepFunctions.updateProgress(st)}, HardwareInterface.settings.pulseInterval);   
                                $scope.brewday.set("steps", $scope.stepParams).save()
                        } else {
                                st.percentageComplete = 100
                                $scope.stepFunctions.deactivate(st)                                
                        }
                },
                updateProgress:function (st) {

                        st.currentValue = HardwareInterface.hardwareReadings()[st.hardwareReference].readings[st.hardwareVariable]

                        st.percentageComplete = ( Math.round(st.currentValue-st.originalValue,0) / Math.round(st.targetValue-st.originalValue,0) ) * 100       
                        st.subtitle = Math.round((st.currentValue - st.originalValue)/st.divideResultBy, 1) + " / " + Math.round((st.targetValue-st.originalValue)/st.divideResultBy,1) + st.targetValueUnit

                        if (st.reverse==true) { 

                                st.subtitle = Math.round((st.originalValue - st.currentValue)/st.divideResultBy,1) + "/" + Math.round((st.originalValue - st.targetValue)/st.divideResultBy,1)

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

                        st.commandPort= 151

                        st.divideResultBy = 1

                        st.currentValue = 12.23                        

                }


                me = brewParameters;

                stepParams = [                       
                        { 
                                title: "Prefill HLT",
                                isCurrent: true,
                                command: "HLT SET VOL ",
                                targetValue: me.HLT_total_water_needed,
                                targetValueUnit: "l",
                                hardwareReference: "hlt",
                                hardwareVariable: "vol"
                        },

                ]

                water_remaining = me.HLT_total_water_needed               
                previous_temperature = 0
                me.MSH_steps.forEach(function(step, index) {

                        if(step.water_temperature!=previous_temperature) {
                                stepParams.push({ 
                                        title: "Raise HLT temperature for " + step.step,
                                        command: "HLT SET TEMP ",
                                        targetValue: step.water_temperature,
                                        targetValueUnit: "&deg;C",
                                        hardwareReference: "hlt",
                                        hardwareVariable: "temp"
                                })        
                        }
                        previous_temperature = step.water_temperature


                        water_remaining = water_remaining - step.water_volume
                        stepParams.push({ 
                                title: "Transfer Mash Liquor for "+ step.step,
                                command: "HLT SET VOL ",
                                targetValue: water_remaining,
                                targetValueUnit: "l",
                                hardwareReference: "hlt",
                                hardwareVariable: "vol"
                        })

                        if (me.MSH_steps.length-1>index) {
                                stepParams.push({ 
                                        title: "Raise temperature ready for " + me.MSH_steps[index+1].step,
                                        command: "HLT SET TEMP ",
                                        targetValue: me.MSH_steps[index+1].water_temperature,
                                        targetValueUnit: "&deg;C",
                                        hardwareReference: "hlt",
                                        hardwareVariable: "temp",
                                        continueWithoutCompletion: true
                                })      
                        }

                        stepParams.push({ 
                                title: "Wait for " + step.step,
                                command: null,
                                targetValue: "HardwareInterface.hardwareReadings()['hlt'].readings['timer'] + " + (step.time * 1000),
                                targetValueUnit: "ms",
                                hardwareReference: "hlt",
                                hardwareVariable: "timer",
                                divideResultBy: 1000
                        })
                })


                stepParams.forEach(function(step) {
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


        $scope.reduceInventory = function () {

                promises=[]

                $ionicLoading.show({
                        template: 'Reducing inventory...'
                });

                RecipeScraper.regulariseRecipe(recipe).then(function(recipe) {
                        recipe.forEach(function(ingredient) {
                                newVal=ingredient.get("onHand")-ingredient.get("amount")
                                newVal=newVal<0 ? 0 : newVal                               
                                promises.push(ingredient.set("onHand", newVal).save())
                        })

                        $q.all(promises).then(function() {
                                $ionicLoading.hide()
                        })
                })
        }

});
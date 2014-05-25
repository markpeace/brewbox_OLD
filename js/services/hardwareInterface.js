brewbox.factory('HardwareInterface', function($http, $interval) {

        var settings = {
                activated: false,
                pulseInterval: 2000,
                requestsMade: 0,
                server: 'http://telnetservice.herokuapp.com/bowerfold.dlinkddns.com'
        }

        var hardwareReadings= {
                hlt: {parameters:{}, readings: {}}
        }

        var requestQueue = [{
                port: 200,
                command: "HLT PARAMETERS",
                assignResponseTo: "hardwareReadings.hlt.parameters",
                requeueAfterProcessing: false,
        },{
                port: 200,
                command: "HLT PING",
                assignResponseTo: "hardwareReadings.hlt.readings",
                requeueAfterProcessing: true,
        },{
                port: 200,
                command: "HLT SET VOL 0",
                assignResponseTo: "temp",
                requeueAfterProcessing: false,
        },{
                port: 200,
                command: "HLT SET TEMP 0",
                assignResponseTo: "temp",
                requeueAfterProcessing: false,
        }]

        processRequest = function () {
                settings.requestsMade++;        
                
                if (requestQueue.length==0) { return; }

                var currentRequest = requestQueue[0];
                requestQueue.splice(0,1)


                $http({method: 'GET', url: settings.server+"/"+currentRequest.port+"/"+currentRequest.command })
                .success(function(result) {                        
                        eval(currentRequest.assignResponseTo + "=" + JSON.stringify(result))                        
                        if (currentRequest.requeueAfterProcessing) requestQueue.push(currentRequest);
                })          

        }
        if (!settings.activated) { settings.activated=true; $interval(processRequest, settings.pulseInterval)}        

        return {
                settings: settings,
                requestQueue: requestQueue,
                hardwareReadings: function() { return hardwareReadings }
        }


});
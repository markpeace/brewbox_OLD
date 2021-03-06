brewbox.factory('HardwareInterface', function($http, $interval) {

        var settings = {
                activated: false,
                pulseInterval: 1000,
                requestsMade: 0,
                server: 'http://mptoolbox.herokuapp.com/telnet/bowerfold.dlinkddns.com'
        }

        var hardwareReadings= {
                hlt: {parameters:{}, readings: {}},
                msh: {parameters:{}, readings: {}}
        }

        var requestQueue = 
            [/*{
                    port: 151,
                    command: "HLT EMU 0"
            },*/{
                    port: 151,
                    command: "HLT PARAMETERS",
                    assignResponseTo: "hardwareReadings.hlt.parameters",
                    requeueAfterProcessing: false,
            },{
                    port: 151,
                    command: "HLT PING",
                    assignResponseTo: "hardwareReadings.hlt.readings",
                    requeueAfterProcessing: true,
            }]

        processRequest = function () {
                
                settings.requestsMade++;        

                if (requestQueue.length==0) { return; }

                var currentRequest = requestQueue[0];
                
                console.log(currentRequest)
                
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
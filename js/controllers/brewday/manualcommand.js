brewbox.controller('ManualCommand', function($scope, $ionicPopup, HardwareInterface) { 
        $scope.commands = [
                { name: "HLT Volume", header:true },
                { name: "Set Volume", command: "HLT SET VOL", port:151, parameterPrompt: "Enter total desired volume"},
                { name: "Transfer Volume", command: "HLT XFER VOL", port:151, parameterPrompt: "Enter volume to released" },
                { name: "Override Volume", command: "HLT OVR VOL", port:151, parameterPrompt: "Enter total desired volume"},
                { name: "HLT Temperature", header:true },
                { name: "Set Temperature", command: "HLT SET TEMP", port:151, parameterPrompt: "Enter desired temperature"}
        ]               

        $scope.execute = function(command) {
                
                param=""
       
                if (command.parameterPrompt) { 
                setTimeout(function() {
                        HardwareInterface.requestQueue.push({ port: command.port, command:command.command + " " + prompt(command.parameterPrompt) }) 
                }, 0);
                } else {
                             
                }
        }
});
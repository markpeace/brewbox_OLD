brewbox.controller('ManualCommand', function($scope, HardwareInterface) { 
        $scope.commands = [
                { name: "HLT Volume", header:true },
                { name: "Get Volume", command: "HLT GET VOL", port:150 },
                { name: "Set Volume", command: "HLT SET VOL", port:150, parameterPrompt: "Enter total desired volume"},
                { name: "Transfer Volume", command: "HLT XFER VOL", port:150, parameterPrompt: "Enter volume to released" },
                { name: "HLT Temperature", header:true },
                { name: "Get Temperature", command: "HLT GET TEMP", port:150 },
                { name: "Set Temperature", command: "HLT SET TEMP", port:150, parameterPrompt: "Enter desired temperature"}
        ]               

        $scope.execute = function(command) {
                param = ""
                if (command.parameterPrompt) param=" " + prompt(command.parameterPrompt)
                HardwareInterface.requestQueue.push({ port: command.port, command:command.command + param })

        }
});
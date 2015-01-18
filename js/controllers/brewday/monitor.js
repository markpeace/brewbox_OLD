brewbox.controller('Monitor', function($scope) { 

        $scope.components=[{
                title: 'Hot Liquor Tun',      
                hardwareReference: 'hlt',
                indicators: { 
                        level: { colour: 'CornflowerBlue' },
                        temperature: { readingVariable: 'temp' },
                        heatingElement: true
                }
        },{
                title: 'Mash Tun',      
                hardwareReference: 'msh',
                indicators: { 
                        level: { colour: 'GoldenRod' },
                        temperature: { readingVariable: 'timer' }
                }
        },{
                title: 'Copper',      
                hardwareReference: 'hlt',
                indicators: { 
                        level: { colour: 'GoldenRod' },
                        temperature: { readingVariable: 'timer' }
                }
        }]   
        
});
brewbox.controller('Monitor', function($scope) { 

        $scope.components=[{
                title: 'Hot Liquor Tun',      
                hardwareReference: 'hlt',
                indicators: { 
                        level: { colour: 'CornflowerBlue' },
                        temperature: { readingVariable: 'temp' }
                }
        },{
                title: 'Mash Tun',      
                hardwareReference: 'hlt',
                indicators: { 
                        level: { colour: 'GoldenRod' },
                        temperature: { readingVariable: 'temp' }
                }
        },{
                title: 'Copper',      
                hardwareReference: 'hlt',
                indicators: { 
                        level: { colour: 'GoldenRod' },
                        temperature: { readingVariable: 'temp' }
                }
        }]   
        
});
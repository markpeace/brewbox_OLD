brewbox.config(function($stateProvider, $urlRouterProvider) {

        $stateProvider

                .state('ui', {
                url: '/ui',
                abstract: true,
                controller:'MainUI',
                templateUrl: 'pages/mainUI.html'
        })
                .state('ui.splash', {
                url: '/brewday',
                views: {
                        /*'centre-panel': {
                                templateUrl: 'pages/brewday/monitor.html',
                                controller: 'Monitor'
                        },*/
                        'centre-panel': {
                                templateUrl: 'pages/brewday/splash.html',
                                controller: 'Splash'
                        },
                        'left-panel': {
                                templateUrl: 'pages/menu.html'
                        },
                        'right-panel': {
                                templateUrl: 'pages/brewday/manualcommand.html',
                                controller: 'ManualCommand'
                        }
                }
        })
                .state('ui.brewday', {
                url: '/brewday/:id',
                views: {
                        'centre-panel': {
                                templateUrl: 'pages/brewday/monitor.html',
                                controller: 'Monitor'
                        },
                        'left-panel': {
                                templateUrl: 'pages/menu.html'
                        },'right-panel': {
                                templateUrl: 'pages/brewday/steps.html',
                                controller: 'Steps'
                        }
                }
        })        
                .state('ui.recipes', {
                url: '/recipes/:recipe_id',
                views: {
                        'centre-panel': {
                                templateUrl: 'pages/recipes/list.html',
                                controller: 'ListRecipes'
                        },
                        'left-panel': {
                                templateUrl: 'pages/menu.html'
                        },'right-panel': {
                                templateUrl: 'pages/recipes/profile.html',
                                controller: 'RecipeProfile'
                        }
                }
        })
                .state('ui.inventory', {
                url: '/inventory/:ingredient_id',
                views: {
                        'centre-panel': {
                                templateUrl: 'pages/inventory/list.html',
                                controller: 'ListInventory'
                        },
                        'left-panel': {
                                templateUrl: 'pages/menu.html'
                        },'right-panel': {
                                templateUrl: 'pages/inventory/profile.html',
                                controller: 'IngredientProfile'
                        }
                }
        })
                .state('ui.schedule', {
                url: '/schedule/',
                views: {
                        'centre-panel': {
                                templateUrl: 'pages/schedule/list.html',
                                controller: 'ListSchedule'
                        },
                        'left-panel': {
                                templateUrl: 'pages/menu.html'
                        }
                }
        })
                .state('ui.shoppingList', {
                url: '/schedule/:listdate',
                views: {
                        'centre-panel': {
                                templateUrl: 'pages/schedule/list.html',
                                controller: 'ListSchedule'
                        },
                        'left-panel': {
                                templateUrl: 'pages/menu.html'
                        },'right-panel': {
                                templateUrl: 'pages/schedule/shoppinglist.html',
                                controller: 'ListSchedule'
                        }
                }
        })
        $urlRouterProvider.otherwise("/ui/brewday")

})
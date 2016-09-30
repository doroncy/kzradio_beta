var kzRadioApp = angular.module('kzRadioApp', [
    'ngRoute',
    'kzRadioControllers',
    'kzFilters',
    'ngSanitize'
]);

kzRadioApp.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/', {
                controller: 'navigationCtrl'
            });
    }]);
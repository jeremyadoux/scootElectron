(function() {
  'use strict';

  angular
      .module('app', [])
      .controller("favoriteCtrl", favoriteCtrl);

  favoriteCtrl.$inject = ['$scope'];

  function favoriteCtrl($scope) {
    const {ipcRenderer} = require('electron');
    var vm = this;

    //@Method
    vm.saveFavorite = saveFavorite;

    //@Variable
    vm.groups = [];

    ipcRenderer.send('load-group-list', null);

    ipcRenderer.on('group-list-loaded', (event, arg) => {
      console.log(arg);
      vm.groups = arg.view.body["0"].organization["0"].group;
      $scope.$apply();
    });

    function saveFavorite() {
      ipcRenderer.send('save-group-favorite', vm.groups);
    }
  }
})();

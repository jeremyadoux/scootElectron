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

    //@Variable


    ipcRenderer.send('load-group-list', null);

    ipcRenderer.on('group-list-loaded', (event, arg) => {
      console.log(arg); 
    });
  }
})();

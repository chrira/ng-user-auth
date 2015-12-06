(function () {
  'use strict';

  angular
    .module('ngUserAuth')
    .directive('ngUserAuth', ngUserAuth);

  /** @ngInject */
  function ngUserAuth($rootScope, ngUserAuthInfoService) {
    var directive = {
      link: linkNgUserAuth
    };

    function linkNgUserAuth(scope, element, attrs) {
      // make sure that there will never be a property on the scope that matches a role name by providing an
      // empty isolated scope. otherwise the $eval() might have side effects
      var evalScope = $rootScope.$new(true);

      var hasPermission = evalScope.$eval(attrs.hasPermission) || attrs.hasPermission;
      var hasAnyPermission = evalScope.$eval(attrs.hasAnyPermission) || attrs.hasAnyPermission;
      var lacksPermission = evalScope.$eval(attrs.lacksPermission) || attrs.lacksPermission;
      var isUserType = evalScope.$eval(attrs.isUserType) || attrs.isUserType;

      // closure so we can re-calculate when permissions change
      function toggleVisibilityBasedOnPermission() {
        if (ngUserAuthInfoService.checkPermissions(hasPermission, hasAnyPermission, lacksPermission, isUserType)) {
          element.show();
        } else {
          element.hide();
        }
      }

      toggleVisibilityBasedOnPermission();
      ngUserAuthInfoService.notifyOnAuthChange(toggleVisibilityBasedOnPermission);
    }

    return directive;
  }
})();

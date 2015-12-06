(function () {
  'use strict';

  angular
    .module('ngUserAuth')
    .factory('ngUserAuthInterceptor', ngUserAuthInterceptor);

  /** @ngInject */
  function ngUserAuthInterceptor($q, ngUserAuthService, Config) {
    // promises needed to cancel $http calls that have been intercepted
    var cancelPromises = [];

    // create a new timeout promise that can be resolved if needed (and therefore cancel the underlying $http call)
    function newTimeout() {
      var cancelPromise = $q.defer();
      cancelPromises.push(cancelPromise);
      return cancelPromise;
    }

    function completeRequest(config) {
      if (config && config.$timeout) {
        var index = cancelPromises.indexOf(config.$timeout);
        if (index >= 0) {
          cancelPromises.splice(index, 1);
        }
      }
    }

    // cancel all pending $http calls by resolving their timeout promise
    function cancelAll() {
      angular.forEach(cancelPromises, function (cancelPromise) {
        cancelPromise.promise.isGloballyCancelled = true;
        cancelPromise.resolve();
      });
      cancelPromises.length = 0;
    }

    return {
      request: function (config) {
        config = config || {};

        // only cancel API calls
        if (Config.api && Config.api.url && config.url && config.url.indexOf(Config.api.url) < 0) {
          config.noCancelOnRouteChange = true;
        }

        // add a timeout promise to each request so we can cancel them if we intercept a 401/403 response
        // adjusted to our needs from https://github.com/AlbertBrand/angular-cancel-on-navigate
        if (config.timeout === undefined && !config.noCancelOnRouteChange) {
          config.$timeout = newTimeout();
          config.timeout = config.$timeout.promise;
        }

        // if we have a token, add it to the header
        var userToken = ngUserAuthService.getUserToken();
        if (userToken) {
          config.headers.Authorization = 'Bearer ' + userToken;
        }
        return config;
      },

      response: function (response) {
        completeRequest(response.config);
        return response;
      },

      responseError: function (response) {
        // if the request has been cancelled, don't do anything
        if (response.config.timeout.isGloballyCancelled) {
          return $q.defer().promise;
        } else {
          completeRequest(response.config);
        }

        // HTTP 401 means unauthorized, so the token is invalid or nonexistent --> log in the user again
        // HTTP 403 means the server could authenticate the user but he does not have the right to access the
        // requested URL --> show an error message to the user
        if (response.status === 401) {
          // cancel all pending requests
          cancelAll();

          // notify UI that the user is no longer logged in
          ngUserAuthService.clearUserToken();

          // change to the login page
          ngUserAuthService.goToLoginScreen();
        } else if (response.status === 403) {
          response.hasNoAccess = true;
        }
        return $q.reject(response);
      }
    };
  }
})();

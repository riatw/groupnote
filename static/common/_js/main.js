var $ = require('jquery');
var jQuery = require('jquery');
require('angular');
require('angular-route');
require('angular-bootstrap');
require('angular-scroll');
require('marked');
require('angular-marked');
require('./setting.js');
var SETTING = require('./setting.js')();
console.log(SETTING);

// angular.module('mynote').controller(

//Define a Module
// var mynote = angular.module('mynote', ['ui.bootstrap','ngRoute']);
var mynote = angular.module('mynote', ['ui.bootstrap','hc.marked','ngRoute','duScroll']);

angular.module('mynote').service('dataAPI', function(stateObject, $http, $location) {
	var service = {
		current: {
			username: "",
			sessionId: "",
			accessToken: "",
		},
		saveLocalVars: function() {

		},
		baseurl: SETTING.CMSURL,
		currentSessionId: function() {
			return localStorage.getItem("sessionId");
		},
		init: function() {

		},
		login: function(username, password, callback, error) {
			$http.defaults.headers.common['X-MT-Authorization'] = null;

			var url = this.baseurl + "/authentication";
			url = url + "?username=" + username + "&password=" + password + "&clientId=gnote";

			$http.post(url).success(function(json, status){
				localStorage.setItem("accessToken", json.accessToken);
				localStorage.setItem("sessionId", json.sessionId);
				localStorage.setItem("username", username);

				stateObject.currentUser = json;

				callback(json);
			});
		},
		logout: function(callback) {
			var url = this.baseurl + "/authentication";

			$http.defaults.headers.common['X-MT-Authorization'] = "MTAuth sessionId=" + localStorage.getItem("sessionId");

			$http.delete(url).success(function(json, status){
				localStorage.setItem("accessToken", "");
				localStorage.setItem("sessionId", "");

				stateObject.currentUser = null;

				callback(json);
			});
		},
		token: function(callback, error) {
			var url = this.baseurl + '/token';

			$http.defaults.headers.common['X-MT-Authorization'] = "MTAuth sessionId=" + this.currentSessionId();

			$http.post(url).success(function(json, status){
				localStorage.setItem("accessToken", json.accessToken);
				stateObject.currentUser = json;

				callback(json);
			});
		},
		get: function(filter, auth, callback) {
			var url = 'http://riatw.me/mt/mt-data-api.fcgi/v3/sites/' + SETTING.BLOGID + '/entries';

			url = url + '/' + stateObject.currentNoteId;

			if ( filter == false ) {
				url = url + '?no_text_filter=1';
			}

			if ( auth ) {
				var accessToken = "MTAuth accessToken=" + localStorage.getItem("accessToken");
				$http.defaults.headers.common['X-MT-Authorization'] = accessToken;
			}

			$http.get(url)
			.success(function(json, status){
				stateObject.currentNote = json;

				callback(json);
			})
			.error(function() {
				alert("接続が切断されました、リロードしてください");
			});
		},
		load: function(type, filter, callback) {
			var url = this.baseurl + '/sites/' + SETTING.BLOGID + '/' + filter + type;
			url = url + '?limit=100';

			if ( localStorage.getItem("accessToken")) {
				var accessToken = "MTAuth accessToken=" + localStorage.getItem("accessToken");
				$http.defaults.headers.common['X-MT-Authorization'] = accessToken;
			}

			$http.get(url)
			.success(function(json, status){
				callback(json);
			})
			.error(function() {
				alert("接続が切断されました、リロードしてください");
			});
		},
		create: function(type, object, callback) {
			var url = this.baseurl + '/sites/' + SETTING.BLOGID + '/' + type;

			var accessToken = "MTAuth accessToken=" + localStorage.getItem("accessToken");

			$http.defaults.headers.common['X-MT-Authorization'] = accessToken;

			$http.defaults.headers.post["Content-Type"] = 'application/x-www-form-urlencoded;application/json;charset=utf-8';

			$http({
				url: url,
				method: "POST",
				data: jQuery.param({"entry": JSON.stringify(object)})
			})
			.success(function (json, status) {
				stateObject.currentNote = json;
				stateObject.currentNoteId = json.id;

				callback(json);
			})
			.error(function() {
				alert("接続が切断されました、リロードしてください");
			});
		},
		update: function(type, object, callback) {
			var url = this.baseurl + '/sites/' + SETTING.BLOGID + '/' + type;
			url = url + "/" + object.id + "?__method=PUT";

			var accessToken = "MTAuth accessToken=" + localStorage.getItem("accessToken");

			$http.defaults.headers.common['X-MT-Authorization'] = accessToken;

			$http.defaults.headers.post["Content-Type"] = 'application/x-www-form-urlencoded;application/json;charset=utf-8';

			$http({
				url: url,
				method: "POST",
				data: jQuery.param({"entry": JSON.stringify(object)})
			})
			.success(function (json, status) {
				stateObject.currentNote = json;
				stateObject.currentNoteId = json.id;

				callback(json);
			})
			.error(function() {
				alert("接続が切断されました、リロードしてください");
			});
		},
		delete: function(type, id,callback) {
			var accessToken = "MTAuth accessToken=" + localStorage.getItem("accessToken");

			$http.defaults.headers.common['X-MT-Authorization'] = accessToken;

			var url = this.baseurl + '/sites/' + SETTING.BLOGID + '/' + type;
			url = url + '/' + id;

			$http({
				url: url,
				method: 'DELETE'
			})
			.success(function (json, status) {
				stateObject.currentNote = null;
				stateObject.currentNoteId = null;

				callback(json);
			})
			.error(function() {
				alert("接続が切断されました、リロードしてください");
			});
		}
	}

	return service;
});

// Markdown Render
angular.module('mynote').config(['markedProvider', function(markedProvider) {
	markedProvider.setOptions({gfm: true});
}]);

//Router
angular.module('mynote').config(function($routeProvider) {
	$routeProvider
	.when("/tag/:tagid", {
		controller: 'tagListController'
	})
	.when("/tag/:tagid/note/:noteid", {
		controller: 'noteListController'
	});
}).run(function($route) {});

//currentObject Service
angular.module('mynote').service('stateObject', function() {
	var service = {
		currentUser: "",
		currentTagId : "all",
		currentNoteId: null
	}

	return service;
});

//SignUp
angular.module('mynote').controller("signUpModalController", function ($scope, $modal) {
	$scope.open = function (size) {
		var modalInstance = $modal.open({
			templateUrl: 'common/views/signup.html',
			controller: signUpController,
			size: size
		});
	}

	var signUpController = function ($scope, $modalInstance) {
		$scope.form = {
			email: '',
			username: '',
			password: ''
		}

		$scope.ok = function () {
			user.signUp(null, {
				success: function(user) {
					$scope.currentUser = user;
					$scope.$apply();
					$modalInstance.dismiss('cancel');

					alert("ユーザの作成が完了しました。");
					location.reload();
				}
			});
		}

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		}
	}
});

//Login
angular.module('mynote').controller("loginController", function($scope,stateObject,$rootScope, dataAPI) {
	$scope.init = function() {
		dataAPI.token(function(json) {
			$scope.currentUser = stateObject.currentUser;
			$scope.currentUserName = localStorage.getItem("username");

			$rootScope.$broadcast('BCRefreshTags');
			$rootScope.$broadcast('BCRefreshNoteList');
			$rootScope.$broadcast('BCRefreshNoteDetail');
		});
	}

	$scope.logIn = function() {
		dataAPI.login($scope.username, $scope.password, function() {
			$scope.currentUser = stateObject.currentUser;
			$scope.currentUserName = stateObject.currentUser.name;

			$rootScope.$broadcast('BCRefreshTags');
			$rootScope.$broadcast('BCRefreshNoteList');
			$rootScope.$broadcast('BCRefreshNoteDetail');
		});
	}

	$scope.logOut = function(form) {
		dataAPI.logout(function() {
			$scope.currentUser = null;

			$rootScope.$broadcast('BCRefreshTags');
			$rootScope.$broadcast('BCRefreshNoteList');
			$rootScope.$broadcast('BCRefreshNoteDetail');
		});
	}
});

//addNote
angular.module('mynote').controller("addNoteModalController", function ($scope, $modal) {
	$scope.open = function (item) {
		var modalInstance = $modal.open({
			templateUrl: 'common/views/note_create.html',
			controller: addNoteController,
			resolve: {
				items: function() {
					return item;
				}
			}
		});
	}

	var addNoteController = function ($scope, $modalInstance, items, $rootScope, stateObject, $location, dataAPI) {

		$scope.form = {
			title: '',
			body: '',
			tags: '',
			status: 'Draft',
			format: 'markdown',
		}

		$scope.noteIsLoaded = 0;

		//編集の場合
		if ( items ) {
			dataAPI.get(false, true, function(json) {
				$scope.form.title = json.title;
				$scope.form.body = json.body;
				$scope.form.tags = json.tags.join(",");
				$scope.form.status = json.status;
				$scope.form.format = json.format;
				$scope.noteIsLoaded = 1;
			});
		}
		else {
			$scope.noteIsLoaded = 1;
		}

		$scope.ok = function () {
			var object = {};
			var tags;
			var method;

			object.title = $scope.form.title;
			object.body = $scope.form.body;
			object.tags =  $scope.form.tags.split(",");
			object.status = $scope.form.status;
			object.format = $scope.form.format;

			if ( items ) {
				object.id = items.id;

				dataAPI.update("entries", object, function() {
					$modalInstance.dismiss('cancel');
					$rootScope.$broadcast('BCRefreshTags');
					$rootScope.$broadcast('BCRefreshNoteList');
					$rootScope.$broadcast('BCRefreshNoteDetail');
				});
			}
			else {
				dataAPI.create("entries", object, function() {
					$modalInstance.dismiss('cancel');
					$rootScope.$broadcast('BCRefreshTags');
					$rootScope.$broadcast('BCRefreshNoteList');
					$rootScope.$broadcast('BCRefreshNoteDetail');
				});
			}
		}

		$scope.delete = function () {
			if( window.confirm('ノートを削除します。よろしいですか？') ){
				dataAPI.delete("entries", items.id, function() {
					$modalInstance.dismiss('cancel');
					$location.path("/tag/all");
					$rootScope.$broadcast('BCRefreshNoteList');
				});
			}
		}

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		}
	}
});

//タグ一覧表示用のコントローラ
angular.module('mynote').controller("searchNoteController", function ($scope, stateObject,$rootScope) {

	$scope.search = function() {
		stateObject.currentSearchKeyword = $scope.q;
		console.log($scope.q);
		$rootScope.$broadcast('BCChangeSearchKeyword');
	}
});

//タグ一覧表示用のコントローラ
angular.module('mynote').controller("tagListController", function ($scope, stateObject, $routeParams, $rootScope, $location, dataAPI) {

	//タグの一覧表示
	$scope.viewTags = function() {
		$scope.isNoteDetailLoaded = 0;
		$scope.loadTagSp = 1;

		dataAPI.load("tags", "", function(json) {
			$scope.taglist = json.items;
			$scope.loadTagSp = 0;
		})
	}

	$scope.$on('BCRefreshTags', function() {
		$scope.currentTagId = stateObject.currentTagId;
		$scope.viewTags();
	});

	//URLに応じてタグを選択状態にする
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if ( $routeParams.noteid != null ) {
			return;
		}
		if ( $routeParams.tagid ) {
			$scope.currentTagId = $routeParams.tagid;
			stateObject.currentTagId = $routeParams.tagid;

			$rootScope.$broadcast('BCRefreshNoteList');
		}
		else {
			$scope.currentTagId = "all";
		}
	});
});

//ノート一覧表示用のコントローラ
angular.module('mynote').controller("noteListController", function($scope, stateObject, $routeParams, $rootScope, $location,dataAPI) {

	$scope.viewNotes = function() {
		var items = [];
		var filter = "";

		//ノートが0件の際のアイコンを非表示
		$scope.noteIsEmpty = 0;

		//スピナーを表示
		$scope.spinnerView = 1;

		if ( stateObject.currentTagId != "all" ) {
			filter = "tags/" + stateObject.currentTagId + "/"
		}

		dataAPI.load("entries", filter, function(json) {
			$scope.feeds = json.items;

			//スピナーを非表示
			$scope.spinnerView = 0;

			if ( json.totalResults == 0 ) {
				//ノートが0件の際のアイコンを表示
				$scope.noteIsEmpty = 1;
			}
		})
	};

	$scope.$on('BCRefreshNoteList', function() {
		$scope.currentNoteId = stateObject.currentNoteId;
		$scope.currentTagId = stateObject.currentTagId;
		$scope.viewNotes();
		console.log("ref list");
	});

	$scope.$on('BCChangeSearchKeyword', function() {
		$scope.currentSearchKeyword = stateObject.currentSearchKeyword;
	});

	//URLに応じてノートを選択状態にする
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if ( $routeParams.noteid ) {
			$scope.currentNoteId = $routeParams.noteid;
			stateObject.currentNoteId = $routeParams.noteid;

			dataAPI.get(true, false, function(json) {
				$rootScope.$broadcast('BCRefreshNoteDetail');
			});
		}
		else {
			$scope.currentNoteId = "";
		}
	});
});

angular.module('mynote').controller("noteDetailController", function($scope,stateObject, $rootScope,marked) {
	$scope.viewNoteDetail = function() {
		var item = stateObject.currentNote;

		if ( item ) {
			$scope.isNoteDetailLoaded = 0;

			$scope.detailTitle = item.title;

			$scope.detailBody = marked(item.body, function (err, content) {
				var start = 0;
				var end = 0;
				var stash = "<ul>";
				var array = [];
				//array
					// - id
					// - text
					// - child - id / - text

				var contentHTML = $("<div />").append(content);
				var all = $(contentHTML).children();
				var h3Count = 0;

				contentHTML.find("h2").each(function(i){
					var array_temp = new Object;
					array_temp.child = [];

					end = $(this).nextAll("h2").eq("0").index();

					if ( end == -1 ) {
						end = all.length;
					}

					var count = all.slice(start,end).filter("h3").length - 1;
					array_temp.id = "h2-" + (i+1);
					$(this).attr("id","h2-" + (i+1));

					array_temp.text = $(this).text();

					all.slice(start,end).filter("h3").each(function(i){
						var array_temp2 = new Object;
						h3Count++;
						array_temp2.id = "h3-" + h3Count;
						array_temp2.text = $(this).text();

						$(this).attr("id","h3-" + h3Count);

						array_temp.child.push(array_temp2);
					});

					start = end;

					array.push(array_temp);
				});

				$scope.outline = array;

				$scope.isNoteDetailLoaded = 1;
				return contentHTML.html();
			});

			$scope.currentNote = item.id;
			$("#scroll-container").scrollTop(0);

			$scope.item = item;
		}
	};

	$scope.$on('BCRefreshNoteDetail', function() {
		$scope.currentNoteId = stateObject.currentNoteId;
		$scope.viewNoteDetail();
	});
});
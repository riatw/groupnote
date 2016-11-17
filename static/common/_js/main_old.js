var $ = require('jquery');
var jQuery = require('jquery');
require('angular');
require('angular-route');
require('angular-bootstrap');
require('angular-scroll');
require('marked');
require('angular-marked');
require('ng-file-upload');

//Define a Module
// var mynote = angular.module('mynote', ['ui.bootstrap','ngRoute']);
var mynote = angular.module('mynote', ['ui.bootstrap','hc.marked','ngRoute','duScroll','ngFileUpload']);

//api setting
var api = new MT.DataAPI({
	baseUrl:  SETTING.CMSURL2,
	clientId: "groupnote"
});
var siteId = SETTING.BLOGID;

// var dataAPI = require('./service/dataapi.js');
// var stateObject = require('./service/state.js');

var stateObject = {
	currentUser: "",
	currentTagId : "all",
	currentNote: null,
	currentNoteId: null
};

// Markdown Render
angular.module('mynote').config(['markedProvider', function(markedProvider) {
	markedProvider.setOptions({
		gfm: true,
		tables: true,
		smartLists: true
	});

	markedProvider.setRenderer({
		link: function(href, title, text) {
			return "<a href='" + href + "'" + (title ? " title='" + title + "'" : '') + " target='_blank'>" + text + "</a>";
		}
	});
}]);

//Router
angular.module('mynote').config(function($routeProvider) {
	$routeProvider
	.when("/tag/:tagid*", {
		controller: 'tagListController'
	})
	.when("/note/:noteid", {
		controller: 'noteListController'
	})
	.when("/note/:noteid", {
		controller: 'shareNoteController'
	})
	.when("/note/:noteid", {
		controller: 'psNoteController'
	})
	.when("/note/:noteid", {
		controller: 'presentationNoteController'
	});
}).run(function($route) {});

//Login
angular.module('mynote').controller("loginController", function($scope,$rootScope) {
	$scope.init = function() {
		api.getToken(function(response) {
			if ( response.error ) {
				stateObject.currentUser = null;
				return;
			}
			stateObject.currentUser = response;
			$scope.currentUser = stateObject.currentUser;
			$scope.currentUserName = localStorage.getItem("username");

			$rootScope.$broadcast('BCRefreshTags');
			$rootScope.$broadcast('BCRefreshNoteList');
		});
	}

	$scope.logIn = function() {
		api.authenticate({
			username: $scope.username,
			password: $scope.password,
			remember: true
		},function(response) {
			console.log(response);
			if (response.error) {
				// エラー処理
				$scope.login_error = 1;
				return;
			}

			$scope.login_error = 0;

			stateObject.currentUser = response;

			$scope.currentUser = stateObject.currentUser;
			$scope.currentUserName = stateObject.currentUser.name;

			$rootScope.$broadcast('BCRefreshTags');
			$rootScope.$broadcast('BCRefreshNoteList');
			$rootScope.$broadcast('BCRefreshNoteDetail');
		});
	}

	$scope.logOut = function(form) {
		api.revokeAuthentication(function(response) {
			$scope.currentUser = null;

			stateObject.currentUser = null;
			stateObject.currentNoteId = null;

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

	var addNoteController = function ($scope, $modalInstance, items, $rootScope, $location, marked,Upload) {

		$scope.form = {
			title: '',
			body: '',
			tags: [],
			status: 'Draft',
			format: 'markdown',
			preview: '',
			preview_height: ''
		}

		$scope.noteIsLoaded = 0;

		//編集の場合
		if ( items ) {
			var _param = {
				no_text_filter: 1
			};

			api.getEntry(SETTING.BLOGID, stateObject.currentNoteId, _param, function(response) {
				stateObject.currentNote = response;

				$scope.form.title = response.title;
				$scope.form.body = response.body;
				$scope.form.tags = response.tags.join(",");
				$scope.form.status = response.status;
				$scope.form.format = response.format;
				$scope.noteIsLoaded = 1;
				$scope.preview();

				$scope.$apply();
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

				api.updateEntry(siteId, object.id, object, function(response) {
					stateObject.currentNote = response;
					stateObject.currentNoteId = response.id;

					$modalInstance.dismiss('cancel');
					$rootScope.$broadcast('BCRefreshTags');
					$rootScope.$broadcast('BCRefreshNoteList');
					$rootScope.$broadcast('BCRefreshNoteDetail');
				});
			}
			else {
				api.createEntry(siteId, object, function(response) {
					stateObject.currentNote = response;
					stateObject.currentNoteId = response.id;

					$modalInstance.dismiss('cancel');
					$rootScope.$broadcast('BCRefreshTags');
					$rootScope.$broadcast('BCRefreshNoteList');
					$rootScope.$broadcast('BCRefreshNoteDetail');
				});
			}
		}

		$scope.delete = function () {
			if( window.confirm('ノートを削除します。よろしいですか？') ){
				api.deleteEntry(siteId, items.id, function(response) {
					stateObject.currentNote = null;
					stateObject.currentNoteId = null;

					$modalInstance.dismiss('cancel');
					$location.path("/tag/all");
					$rootScope.$broadcast('BCRefreshNoteList');
					$rootScope.$broadcast('BCResetNoteDetail');
				});
			}
		}

		$scope.cancel = function () {
			$modalInstance.dismiss('cancel');
		}

		$scope.preview = function() {
			$scope.form.preview = marked($scope.form.body, function (err, content) {
				return content;
			});
		};

		// upload on file select or drop
		$scope.upload = function (files) {
			for ( var i=0; i < files.length; i++ ) {
				api.uploadAsset(siteId, { file: files[i], path: "/files", site_id: SETTING.BLOGID, autoRenameIfExists: true }, function(response) {
					var text;

					if ( response.data.class == "image" ) {
						text = "![" + response.config.data.file.name + "]("+ response.data.url +")";
					}
					else {
						text = "[" + response.config.data.file.name + "]("+ response.data.url +")";
					}

					$scope.form.body = $scope.form.body + "\n" + text;
					$scope.preview();
					$scope.$apply();
				});
			}
		};
	}
});

//タグ一覧表示用のコントローラ
angular.module('mynote').controller("searchNoteController", function ($scope,$rootScope) {

	$scope.search = function() {
		stateObject.currentSearchKeyword = $scope.q;
		$rootScope.$broadcast('BCChangeSearchKeyword');
	}
});

//タグ一覧表示用のコントローラ
angular.module('mynote').controller("tagListController", function ($scope, $routeParams, $rootScope, $location) {

	var that = this;

	//タグの一覧表示
	this.viewTags = function() {
		this.isNoteDetailLoaded = 0;
		this.loadTagSp = 1;

		api.listTagsForSite(SETTING.BLOGID, function(response) {
			var tags = [];

			/* memo
				string: hoge/fuga/piyo
				arr:
					[0]
						- name: hoge
						- child: [0]
								- name: fuga
								- child[0]
									- name: piyo
			*/

			var arr = [];

			for ( var i = 0; i < response.items.length; i++ ) {
				var items_var = response.items[i];
				var items_arr = items_var.name.split("/");
				var id = [];

				for ( var j = 0; j < items_arr.length; j++ ) {
					var current_var = items_arr[j];

					id.push(current_var);

					function inArrayHash(arr, val) {
						var found = -1;

						for ( var i = 0; i < arr.length; i++ ){
							if ( arr[i].name == val ) {
								found = i;
							}
						}

						return found;
					}

					if ( j == 0 ) {
						//ルートが新しくなった
						//tmpに1個目を入れる
						var found = inArrayHash(arr, current_var);

						if ( found == -1 ) {
							arr.push( { id: id.join("/"), name: current_var, child: [] });
						}
					}
					else if ( j == 1 ) {
						//childに入れる
						var found = inArrayHash(arr[arr.length-1].child, current_var);

						if ( found == -1 ) {
							arr[arr.length-1].child.push( { id: id.join("/"), name: current_var, child: [] } );
						}
					}
					else if ( j == 2 ) {
						//childに入れる
						var child = arr[arr.length-1].child.length -1;
						var found = inArrayHash(arr[arr.length-1].child[child].child, current_var);

						if ( found == -1 ) {
							arr[arr.length-1].child[ child ].child.push( { id: id.join("/"), name: current_var } );
						}
					}
				}
			}

			that.taglist = arr;

			that.loadTagSp = 0;
		});
	}

	$scope.$on('BCRefreshTags', function() {
		that.currentTagId = stateObject.currentTagId;
		that.viewTags();
	});

	//URLに応じてタグを選択状態にする
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if ( $routeParams.tagid ) {
			that.currentTagId = $routeParams.tagid;
			stateObject.currentTagId = $routeParams.tagid;

			$rootScope.$broadcast('BCRefreshNoteList');
		}
		else {
			that.currentTagId = "all";
		}
	});
});

//ノート一覧表示用のコントローラ
angular.module('mynote').controller("noteListController", function($scope, $routeParams, $rootScope, $location) {

	$scope.viewNotes = function() {
		var items = [];
		var filter = "";

		//ノートが0件の際のアイコンを非表示
		$scope.noteIsEmpty = 0;

		//スピナーを表示
		$scope.spinnerView = 1;

		// if ( stateObject.currentTagId != "all" ) {
		// 	filter = "tags/" + stateObject.currentTagId + "/"
		// }
		if ( stateObject.currentTagId == "all" ) {
			stateObject.currentTagId = "";
		}

		var _params = {
			sortBy: "modified_on",
			limit: 100
		};

		api.listEntries(SETTING.BLOGID, _params, function(response) {
			$scope.feeds = $.grep(response.items, function(value,index) {
				for ( var i = 0; i < value.tags.length; i++ ) {
					if ( value.tags[i].lastIndexOf(stateObject.currentTagId, 0) === 0 ) {
						return true;
					}
				}
			});

			//スピナーを非表示
			$scope.spinnerView = 0;

			if ( $scope.feeds.length == 0 ) {
				//ノートが0件の際のアイコンを表示
				$scope.noteIsEmpty = 1;
			}

			$scope.$apply();
		})
	};

	$scope.$on('BCRefreshNoteList', function() {
		$scope.currentNoteId = stateObject.currentNoteId;
		$scope.currentTagId = stateObject.currentTagId;
		$scope.viewNotes();
	});

	$scope.$on('BCChangeSearchKeyword', function() {
		$scope.currentSearchKeyword = stateObject.currentSearchKeyword;
	});

	//URLに応じてノートを選択状態にする
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if ( $routeParams.noteid ) {
			$scope.currentNoteId = $routeParams.noteid;
			stateObject.currentNoteId = $routeParams.noteid;

			$rootScope.$broadcast('BCRefreshNoteDetail');
		}
		else {
			$scope.currentNoteId = "";
		}
	});
});

angular.module('mynote').controller("noteDetailController", function($scope, $rootScope,marked) {
	$scope.viewNoteDetail = function() {
		var item = stateObject.currentNote;

		if ( item ) {
			$scope.isNoteDetailLoaded = 0;

			$scope.detailTitle = item.title;
			$scope.updatable = item.updatable;

			$scope.shareUrl = location.protocol + "//" + location.host + "/share/#note/" + item.id;

			$scope.psUrl = location.protocol + "//" + location.host + "/presentation/?note=" + item.id;

			$scope.detailBody = marked(item.body, function (err, content) {
				//array
					// - id
					// - text
					// - child - id / - text

				var start = 0;
				var end = 0;
				var array = [];

				var contentHTML = $("<div />").append(content);
				var $child = $(contentHTML).children();

				contentHTML.find("h1").each(function(i){
					var $this = $(this);
					var temp = {};
					var parentId;

					// 次のh1を探す
					end = $this.nextAll("h1").eq("0").index();

					// 最後のh1だったら
					if ( end == -1 ) {
						end = $child.length;
					}

					parentId = "h1-" + (i+1);

					temp = {
						id: parentId,
						text: $this.text(),
						child: []
					}

					$this.attr("id","h1-" + (i+1));

					$child.slice(start,end).filter("h2").each(function(j){
						var childId = "h2-" + i + "-" + j;
						var $that = $(this);

						temp.child.push({
							id:  childId,
							text: $that.text()
						});

						$that.attr("id",childId);
					});

					start = end;

					array.push(temp);
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

	$scope.resetNoteDetail = function() {
		$scope.isNoteDetailLoaded = 0;
	}

	$scope.$on('BCRefreshNoteDetail', function() {
		if ( stateObject.currentNoteId == null ) {
			$scope.isNoteDetailLoaded = 0;
			return;
		}

		$scope.currentNoteId = stateObject.currentNoteId;
		$scope.detailBody = "";
		$scope.isNoteDetailLoaded = 0;

		var _param = {
			no_text_filter: 1
		};

		api.getEntry(SETTING.BLOGID, stateObject.currentNoteId, _param, function(response) {
			stateObject.currentNote = response;

			$scope.viewNoteDetail();

			$scope.$apply();
		});
	});

	$scope.$on('BCResetNoteDetail', function() {
		$scope.currentNoteId = stateObject.currentNoteId;
		$scope.resetNoteDetail();
	});
});

angular.module('mynote').controller("shareNoteController", function($scope, $rootScope,marked, $routeParams, $location) {

	//URLに応じてノートを選択状態にする
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if ( $routeParams.noteid ) {
			stateObject.currentNoteId = $routeParams.noteid;

			api.getEntry(SETTING.BLOGID, stateObject.currentNoteId, function(response) {
				stateObject.currentNote = response;

				document.title = response.title;

				$scope.title = response.title;
				$scope.detailBody = marked(response.body, function (err, content) {
					return content;
				});

				$scope.$apply();
			});
		}
	});
});
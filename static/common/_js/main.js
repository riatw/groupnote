var $ = require('jquery');
var jQuery = require('jquery');
require('angular');
require('angular-route');
require('angular-bootstrap');
require('angular-scroll');
require('marked');
require('angular-marked');
require('ng-file-upload');
require('./setting.js');
var SETTING = require('./setting.js')();

//Define a Module
// var mynote = angular.module('mynote', ['ui.bootstrap','ngRoute']);
var mynote = angular.module('mynote', ['ui.bootstrap','hc.marked','ngRoute','duScroll','ngFileUpload']);

var dataAPI = require('./service/dataapi.js');
var stateObject = require('./service/state.js');

// Markdown Render
angular.module('mynote').config(['markedProvider', function(markedProvider) {
	markedProvider.setOptions({
		gfm: true,
		tables: true,
		smartLists: true
	});
}]);

//Router
angular.module('mynote').config(function($routeProvider) {
	$routeProvider
	.when("/tag/:tagid", {
		controller: 'tagListController'
	})
	.when("/note/:noteid", {
		controller: 'noteListController'
	})
	.when("/note/:noteid", {
		controller: 'shareNoteController'
	})
	.when("/note/:noteid", {
		controller: 'presentationNoteController'
	});
}).run(function($route) {});

//Login
angular.module('mynote').controller("loginController", function($scope,stateObject,$rootScope, dataAPI) {
	$scope.init = function() {
		dataAPI.token(function(json) {
			$scope.currentUser = stateObject.currentUser;
			$scope.currentUserName = localStorage.getItem("username");

			$rootScope.$broadcast('BCRefreshTags');
			$rootScope.$broadcast('BCRefreshNoteList');
			// $rootScope.$broadcast('BCRefreshNoteDetail');
		});
	}

	$scope.logIn = function() {
		dataAPI.login($scope.username, $scope.password, function() {
			$scope.login_error = 0;

			$scope.currentUser = stateObject.currentUser;
			$scope.currentUserName = stateObject.currentUser.name;

			$rootScope.$broadcast('BCRefreshTags');
			$rootScope.$broadcast('BCRefreshNoteList');
			$rootScope.$broadcast('BCRefreshNoteDetail');
		},
		function() {
			$scope.login_error = 1;
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

	var addNoteController = function ($scope, $modalInstance, items, $rootScope, stateObject, $location, dataAPI, marked,Upload) {

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
			dataAPI.get(false, true, function(json) {
				$scope.form.title = json.title;
				$scope.form.body = json.body;
				$scope.form.tags = json.tags.join(",");
				$scope.form.status = json.status;
				$scope.form.format = json.format;
				$scope.noteIsLoaded = 1;
				$scope.preview();
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
				dataAPI.upload(files[i], function(json) {
					var text;

					if ( json.data.class == "image" ) {
						text = "![" + json.config.data.file.name + "]("+ json.data.url +")";
					}
					else {
						text = "[" + json.config.data.file.name + "]("+ json.data.url +")";
					}

					$scope.form.body = $scope.form.body + "\n" + text;
					$scope.preview();
				});
			}
		};
	}
});

//addNote
angular.module('mynote').controller("addNoteStarController", function ($scope, stateObject, dataAPI) {
	$scope.checkStar = function() {
		$scope.liked = 0;
		$scope.totalResults = 0;

		dataAPI.listStar(function(json) {
			for ( var i=0; i<json.items.length; i++ ) {
				if ( json.items[i].name == localStorage.getItem("username") ) {
					$scope.liked = 1;
				}
			}

			$scope.likedResults = json.totalResults;
		});
	};

	$scope.setStar = function() {
		if ( ! $scope.liked ) {
			dataAPI.addStar(function() {
				dataAPI.listStar(function(json) {
					$scope.liked = 1;
					$scope.likedResults = json.totalResults;
				});
			});
		}
		else {
			dataAPI.removeStar(function() {
				dataAPI.listStar(function(json) {
					$scope.liked = 0;
					$scope.likedResults = json.totalResults;
				});
			});
		}
	}

	$scope.$on('BCRefreshNoteDetail', function() {
		if ( stateObject.currentNoteId == null ) {
			return;
		}
		$scope.checkStar();
	});
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

	var that = this;

	//タグの一覧表示
	this.viewTags = function() {
		this.isNoteDetailLoaded = 0;
		this.loadTagSp = 1;

		dataAPI.load("tags", "", "" , function(json) {
			that.taglist = json.items;
			that.loadTagSp = 0;
		})
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

		dataAPI.load("entries", filter, "&sortBy=modified_on", function(json) {
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

			$rootScope.$broadcast('BCRefreshNoteDetail');
		}
		else {
			$scope.currentNoteId = "";
		}
	});
});

angular.module('mynote').controller("noteDetailController", function($scope,stateObject, $rootScope,marked,dataAPI) {

	$scope.viewNoteDetail = function() {
		var item = stateObject.currentNote;

		if ( item ) {
			$scope.isNoteDetailLoaded = 0;

			$scope.detailTitle = item.title;
			$scope.updatable = item.updatable;

			$scope.shareUrl = location.protocol + "//" + location.host + "/share/#note/" + item.id;

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
			console.log("nullのはず");
			$scope.isNoteDetailLoaded = 0;
			return;
		}

		$scope.currentNoteId = stateObject.currentNoteId;
		$scope.detailBody = "";
		$scope.isNoteDetailLoaded = 0;

		dataAPI.get(false, true, function(json) {
			$scope.viewNoteDetail();
		});
	});

	$scope.$on('BCResetNoteDetail', function() {
		$scope.currentNoteId = stateObject.currentNoteId;
		$scope.resetNoteDetail();
	});
});

angular.module('mynote').controller("shareNoteController", function($scope,stateObject, $rootScope,marked,dataAPI, $routeParams, $location) {

	//URLに応じてノートを選択状態にする
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if ( $routeParams.noteid ) {
			stateObject.currentNoteId = $routeParams.noteid;

			dataAPI.get(false, false, function(json) {
				$scope.title = json.title;
				$scope.detailBody = marked(json.body, function (err, content) {
					return content;
				});
			});
		}
	});
});

angular.module('mynote').controller("presentationNoteController", function($scope,stateObject, $rootScope,marked,dataAPI, $routeParams, $location) {

	//URLに応じてノートを選択状態にする
	$rootScope.$on("$routeChangeSuccess", function(event, current) {
		if ( $routeParams.noteid ) {
			stateObject.currentNoteId = $routeParams.noteid;

			dataAPI.get(false, false, function(json) {
				$scope.title = json.title;
				$scope.detailBody = json.body;

				// Full list of configuration options available at:
				// https://github.com/hakimel/reveal.js#configuration
				Reveal.initialize({
					controls: true,
					progress: true,
					history: true,
					center: true,

					transition: 'slide', // none/fade/slide/convex/concave/zoom

					// Optional reveal.js plugins
					dependencies: [
						{ src: 'lib/js/classList.js', condition: function() { return !document.body.classList; } },
						{ src: 'plugin/markdown/marked.js', condition: function() { return !!document.querySelector( '[data-markdown]' ); } },
						{ src: 'plugin/markdown/markdown.js', condition: function() { return !!document.querySelector( '[data-markdown]' ); } },
						{ src: 'plugin/highlight/highlight.js', async: true, callback: function() { hljs.initHighlightingOnLoad(); } },
						{ src: 'plugin/zoom-js/zoom.js', async: true },
						{ src: 'plugin/notes/notes.js', async: true }
					]
				});
			});
		}
	});
});

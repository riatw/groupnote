var entryId = location.search.replace("?note=","");

//api setting
var api = new MT.DataAPI({
	baseUrl:  SETTING.CMSURL,
	clientId: "gnote"
});

var siteId = SETTING.BLOGID;

api.storeTokenData({
	accessToken: localStorage.getItem("accessToken"),
	expiresIn: 3600,
	sessionId: localStorage.getItem("sessionId")
});

api.getToken(function(response) {
	api.getEntry(siteId, entryId, { no_text_filter: 1 }, function(response) {
		if (response.error) {
			// エラー処理
			return;
		}

		// var body = response.body.replace(/^# /gm,"---\n# ").replace(/^## /gm,"---\n## ").replace(/^---\n---\n/gm,"---\nclass: center, middle\n");

		var body = response.body.replace(/^# /gm,"---\n# ");

		// 冒頭h1で始まる場合は改ページを省略
		if ( body.match(/^---\n/) ) {
			body = body.slice(4);
		}

		body = "class: center, middle\n# " + response.title + "\n---\n" + body;

		var slideshow = remark.create({
			source: body,
			highlightStyle: 'monokai',
			highlightLanguage: 'remark',
			highlightLines: true,
			navigation: {
				scroll: false
			}
		});

		document.title = response.title + " | Group Note";
	});
});
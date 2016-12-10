var entryId = location.search.replace("?note=","");

//api setting
var api = new MT.DataAPI({
	baseUrl:  SETTING.CMSURL,
	clientId: "collect"
});

var siteId = SETTING.BLOGID;

api.getToken(function(response) {
	api.getEntry(siteId, entryId, { no_text_filter: 1 }, function(response) {
		console.log(response);

		if (response.error) {
			// エラー処理
			return;
		}

		var body = response.body_raw
		.replace(/^# (.*)/gm,"---\nclass: center, middle\n# $1 \n---\n")
		.replace(/^## /gm,"---\n## ")
		.replace(/^---\n\n---\n/gm,"---\n")
		.replace(/^---\n\n\n---\n/gm,"---\n");

		// var body = response.body.replace(/^# /gm,"---\n# ");

		// 冒頭h1で始まる場合は改ページを省略
		if ( body.match(/^---\n/) ) {
			body = body.slice(4);
		}

		body = "class: center, middle, topslide\n# " + response.title + "\n---\n" + body;

		console.log(body);

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
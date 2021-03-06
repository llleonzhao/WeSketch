@import "common.js";

var loginKey = "com.sketchplugins.wechat.iconLogin";
var loginNameKey = "com.sketchplugins.wechat.iconLoginName";

function iconLogin(data){
    var r = post(['/users/login','username='+data.username + '&password='+data.password]);
    if(r.status == 200){
        NSUserDefaults.standardUserDefaults().setObject_forKey(data.username,loginNameKey);
    }
    return r;
}

function choiceSVG(layer,doc){
    var slice = MSExportRequest.exportRequestsFromExportableLayer(layer).firstObject();
    slice.scale = '1';
    slice.format = 'svg';
    var save = NSSavePanel.savePanel();
    var savePath = save.URL().path() + '.svg';
    doc.saveArtboardOrSlice_toFile(slice, savePath);
    var content = NSData.dataWithContentsOfURL(NSURL.URLWithString('file:///'+encodeURIComponent(savePath)));
    var string = [[NSString alloc] initWithData:content encoding:NSUTF8StringEncoding];
    var fm  =[NSFileManager defaultManager];
    fm.removeItemAtPath_error(savePath,nil);
    return string;
}

function getLogin(){
    return post(['/users/login']);
}

function queryProject(){
    var r = post(['/users/queryProject']);
    return r;
}

function svgExist(data){
    var r = post(['/users/svgExist','svgname=' + data.svgname + '&projectid=' + data.projectid]);
    return r;
}


function uploadIconFunc(data){
    return post(['/users/single_upload','name='+data.name + '&content='+ data.content + '&projectid=' + data.project + '&categoryid=' + data.type + '&author='+data.author ]);
}

var onRun = function(context){
    var isLogin;
    if(!NSUserDefaults.standardUserDefaults().objectForKey(loginKey) || NSUserDefaults.standardUserDefaults().objectForKey(loginKey).length() != 32){
        isLogin = false;
    }else{
        isLogin = getLogin();
    }
    var selection = context.selection;
    if(selection.length == 1){
        selection = selection[0];
    }else{
        return NSApp.displayDialog('请选中一个您需要上传到项目管理的图标');
    }
    var project = [];
    var svgname = encodeURIComponent(selection.name().toString());
    var svg = encodeURIComponent(choiceSVG(selection,context.document));
    var initData = {svg:svg,svgtest:svgname,isLogin:isLogin};
    if(isLogin == false || isLogin.status != 200){
        initData.isLogin = false;
    }else{
        var username = NSUserDefaults.standardUserDefaults().objectForKey(loginNameKey);
        var b = '';
        b += username;
        initData.nametest = b;
        initData.isLogin = true;
        initData.project = queryProject().list;
    }

    var pluginSketch = context.plugin.url().URLByAppendingPathComponent("Contents").URLByAppendingPathComponent("Sketch").URLByAppendingPathComponent("library").path();
	var panel = SMPanel({
        url: pluginSketch + "/panel/uploadIcon.html",
        width: 300,
        height: 430,
        data:initData,
        hiddenClose: false,
        floatWindow: true,
        identifier: "uploadIcon",
        callback: function( data ){
            if(data.type == 'link'){
                openUrlInBrowser(data.link);
                return;
            }else if(data.type == 'loginout'){
                NSUserDefaults.standardUserDefaults().setObject_forKey('',loginNameKey);
                NSUserDefaults.standardUserDefaults().setObject_forKey('',loginKey);
                return;
            }
            var result = uploadIconFunc(data);
            if(result.status == 200){
                NSApp.displayDialog('上传成功，预览地址已经放入剪贴板');
                return true;
            }else{
                return false;
            }
        },loginCallback:function( windowObject ){
            var data = JSON.parse(decodeURI(windowObject.valueForKey("SMData")));
            var reuslt = iconLogin(data);
            if(reuslt.status == 200){
                var username = NSUserDefaults.standardUserDefaults().objectForKey(loginNameKey);
                var b = '';
                b += username;
                reuslt.nametest = b;
                NSUserDefaults.standardUserDefaults().setObject_forKey(reuslt.sig,loginKey);
                project = queryProject().list;
                reuslt.project = project;
            }
            windowObject.evaluateWebScript("sLogin("+JSON.stringify(reuslt)+")");
        },pushdataCallback:function(data ,windowObject){
            var result = svgExist(data);
            if(result){
                var settingsWindow = COSAlertWindow.new();
                settingsWindow.addButtonWithTitle("上传");
                settingsWindow.addButtonWithTitle("取消");
                var tip = '';
                if(result.code == 1){
                    tip += '存在历史版本，是否上传覆盖？';
                }
                settingsWindow.setMessageText(tip);
                var response = settingsWindow.runModal();
                if(response == "1000"){
                    windowObject.evaluateWebScript("pushdata()");
                }else{
                    windowObject.evaluateWebScript("window.location.hash = '';");

                }
            }
        }
    });
}
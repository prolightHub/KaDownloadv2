

let user = "";
let email = "";
let kaid = "";

const downloadName = "projects";//Projects (your khan Academy project's page) or top (in browse projects)

const limit = 1000;
const sort = 2;

const proxyUrl = "https://cors-anywhere.herokuapp.com/";
const loadWithJsonInfo = true;

var nameCache = {};
let projectStructure = {
    "css" : {
        "index.css" : "https://raw.githubusercontent.com/prolightHub/KaTemplate/master/css/index.css",
    },
    "js" : {
        "index.js" : "https://raw.githubusercontent.com/prolightHub/KaTemplate/master/js/index.js",
        "loadKa.js" : "https://raw.githubusercontent.com/prolightHub/KaTemplate/master/js/loadKa.js",
    },
    "libraries" : {
        "processing.js" : "https://raw.githubusercontent.com/Khan/processing-js/66bec3a3ae88262fcb8e420f7fa581b46f91a052/processing.js",
    },
    "index.html" : "https://raw.githubusercontent.com/prolightHub/KaTemplate/master/index.html",
};

loadCode(projectStructure);

function onReady()
{
    if(email.split('@').length >= 2)
    {
        email = email.split('@')[1];
    }
    if(kaid !== "" && kaid.indexOf("kaid_") === -1)
    {
        kaid = "kaid_" + kaid;
    }

    downloadProjects();
}

function getUrl(limit, extras, type)
{
    if(type === "top")
    {
        return "https://www.khanacademy.org/api/internal/scratchpads/top?limit=" + limit + "&topic_id=xffde7c31&_=1510177446399" + (extras || "");
    }else{
        return "https://www.khanacademy.org/api/internal/user/scratchpads?casing=camel" + 
                "&email=" + user + "%40" + email + ((kaid) ? "&kaid=" + kaid : "") +
                "&sort=" + sort + "&page=0&limit=" + limit + "&subject=all&lang=en&_=1547591539967" + (extras || "");
    }
}

function downloadProject(url)
{
    var zip = new JSZip();

    console.log("Downloading from " + url);
    ajax(proxyUrl + url, function(html)
    {
	   var code = extractCodeJson(html);
	
        var name = code.scratchpad.title.split(' ').join('_');
        addToZip(zip, name, code.scratchpad.revision.code);

        zip.generateAsync({type : "blob"}).then(function(content) 
        {
            saveAs(content, name + ".zip");
        });
    });
}

function downloadProjects()
{
    console.log("Getting Projects Json...");
    sub.value = "Getting Projects Json...";

    var url = getUrl(limit, downloadName);
    $.getJSON(proxyUrl + url, function(json)
    {
        console.log(json);

        projectList = json.scratchpads;

        var pZip = new JSZip();
        var folder = pZip.folder(downloadName.toString() + "-master");

        var loaded = 0;
        var loadedNames = {};

        var name, code;

        json.scratchpads.forEach(function(element, index, array)
        {
            // ajax(proxyUrl + element.url, function(html)
            // {
            //     name = "Loading... (" + (loaded + 1) + "/" + array.length + ")" + " " + element.title;
            //     console.log(name);
            //     sub.value = name;

            //     code = extractCodeJson(html).props;
            //     document.getElementById("preview").src = code.scratchpad.imageUrl;

            //     addToZip(folder, code.scratchpad.title.split(' ').join('_'), 
            //         code.scratchpad.revision.code, code.scratchpad.title,
            //         (loadWithJsonInfo) ? JSON.stringify(element) : undefined, code);

            //     loaded++;
            // });

            $.ajax(proxyUrl + element.url, 
            {
                type: 'GET',
                dataType: 'html',

                beforeSend: function(request) 
                {
                    // request.setRequestHeader("Authority", authorizationToken);
                },

                success: function(html) 
                {
                    name = "Loading... (" + (loaded + 1) + "/" + array.length + ")" + " " + element.title;
                    console.log(name);
                    sub.value = name;

                    code = extractCodeJson(html).props;
                    document.getElementById("preview").src = code.scratchpad.imageUrl;

                    addToZip(folder, code.scratchpad.title.split(' ').join('_'), 
                        code.scratchpad.revision.code, code.scratchpad.title,
                        (loadWithJsonInfo) ? JSON.stringify(element) : undefined, code);

                    loaded++;
                }
            });
        });

        loop = window.setInterval(function()
        {
            if(json.scratchpads.length === loaded)
            {
                console.log("Downloading...");
                sub.value = "Downloading...";
                sub.style.textAlign = "";

                pZip.generateAsync({type : "blob"}).then(function(content) 
                {
                    saveAs(content, downloadName + ".zip");
                    
                    console.log("Finished!");
                    sub.value = "Finished!";
                });

                window.clearInterval(loop);
            }
        }, 1000 / 60);
    })
}

function ajax(url, func)
{
    return fetch(url)
    .then(response => response.text())
    .then(func)
    .catch(err => console.log(err));
}

function addToZip(zip, name, code, nameSp, elementJson, path)
{
    if(typeof nameCache[name] !== "number")
    {
        nameCache[name] = 0;
    }else{
        name += " ("+ (++nameCache[name]) +")";
    }

    var img = zip.folder(name);

    if(code.indexOf("<!DOCTYPE html>") < 64 && code.indexOf("<!DOCTYPE html>") > -1 || 
       code.indexOf("<!doctype html>") < 64 && code.indexOf("<!doctype html>") > -1)
    {
        var css = img.folder("css");
        var js = img.folder("js");
        var libraries = img.folder("libraries");

        img.file("index.html", code);
    }else{
        var css = img.folder("css");
            css.file("index.css", projectStructure.css["index.css"]);

        var js = img.folder("js");
            js.file("index.js", alignCode(code, path.scratchpad.width, path.scratchpad.height));
            js.file("loadKa.js", projectStructure.js["loadKa.js"]);

        var libraries = img.folder("libraries");
            libraries.file("processing.js", projectStructure.libraries["processing.js"]);

        img.file("index.html", projectStructure["index.html"].replace("Processing Js", nameSp || ""));
    }

    if(elementJson)
    {
        img.file("info.json", elementJson);
    }
}

function alignCode(code, width, height)
{
    if(width && height)
    {
        return "function main()\n{\n\nsize(" + width + "," + height + ");\n\n\n" + code.toString() + "\n\n}\n\ncreateProcessing(main);";
    }else{
        return "function main()\n{\n\n" + code.toString() + "\n\n}\n\ncreateProcessing(main);";
    }
}

function extractCode(str)
{
    // var test = "$LAB.queueWait(function() {window[\"./javascript/tutorial-scratchpad-package/scratchpad-page-entry.js\"] = ";
    // var index = str.indexOf(test) + test.length;
    // return str.substring(index, str.indexOf("</script>", index)).slice(0, -2);

            // var test = /\[( )*\"\.\/javascript\/tutorial\-scratchpad\-package\/scratchpad\-page\-entry\.js\"( )*\]( )*\=( )*/;
        var test = "[\"./javascript/tutorial-scratchpad-package/scratchpad-page-entry.js\"] = ";
        var index = str.indexOf(test) + test.length;
        return str.substring(index, str.indexOf("</script>", index)).slice(0, -2);
}

function extractCodeJson(str)
{
    return JSON.parse(extractCode(str));
}

function loadCode(object, onFinish)
{
    for(var i in object)
    {
        if(typeof object[i] === "object")
        {
            loadCode(object[i]);
        }
        else if(typeof object[i] === "string")
        {
            ajax(proxyUrl + object[i], content => 
            {
                object[i] = content.toString();
            });
        }
    }
}


//Try to fill in as many as these as you can.
let user = ""; //url username
let email = ""; //your email's site
let kaid = "";//"kaid_1042009894132225686810694"; //your kaid

const type = "projects";//Projects (your khan Academy project's page) or top (in browse projects)

const limit = 1000;
const sort = 2;

const downloadName = "" || type; 
const proxyUrl = "https://cors-anywhere.herokuapp.com/";//You don't need to change this.
const loadWithJsonInfo = true;

function onReady()
{
    if(email.split('@').length >= 2)
    {
        email = email.split('@')[1];
    }

    downloadProjects();
}

function getUrl(limit, extras)
{
    if(type === "top")
    {
        return "https://www.khanacademy.org/api/internal/scratchpads/top?limit=" + limit + "&topic_id=xffde7c31&_=1510177446399" + (extras || "");
    }else{
        return "https://www.khanacademy.org/api/internal/user/scratchpads?casing=camel" + 
                "&email=" + user + "%40" + email + "&kaid=" + kaid +
                "&sort=" + sort + "&page=0&limit=" + limit + "&subject=all&lang=en&_=1547591539967" + (extras || "");
     }
}

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

let counted = 0;

/*var loop = window.setInterval(function()
{
    if(counted >= 5)
    {
	   onReady();

        window.clearInterval(loop);
    }
}, 1000 / 60);*/

function downloadProject(url)
{
    var zip = new JSZip();

    console.log("Downloading from " + url);
    ajax(proxyUrl + url, function(html)
    {
	var code = extractCodeJson(html);
	
        var name = code.scratchpad.title.split(' ').join('_');
        addToZip(zip, name, alignCode(code.scratchpad.revision.code));

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

    var url = getUrl(limit);
    $.getJSON(proxyUrl + url, function(json)
    {
        console.log(json);

        projectList = json.scratchpads;

        var pZip = new JSZip();

        var zip = pZip.folder(downloadName.toString() + "-master");
        var loaded = 0;

        var loadedNames = {};

        var count = 0;
        json.scratchpads.forEach(function(element, index, array)
        {
            /*Get rid of weird folder names just in case*/
            //element.title = element.url;
            //element.title = element.title.replace("https://www.khanacademy.org/computer-programming/", "");
            //element.title = element.title.substring(-1, element.title.indexOf('/'));

            ajax(proxyUrl + element.url, function(html)
            {
                var name = "Loading... (" + (++count) + "/" + array.length + ")" + " " + element.title;
                console.log(name);
                sub.value = name;

                var code = extractCodeJson(html);
                document.getElementById("preview").src = code.scratchpad.imageUrl;

                addToZip(zip, code.scratchpad.title.split(' ').join('_'), 
                    alignCode(code.scratchpad.revision.code), code.scratchpad.title,
                    (loadWithJsonInfo) ? JSON.stringify(element) : undefined);

                loaded++;
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
				counted++;
                object[i] = content;
            });
        }
    }
}

var nameCache = {};
function addToZip(zip, name, code, nameSp, elementJson)
{
    if(typeof nameCache[name] !== "number")
    {
        nameCache[name] = 0;
    }else{
        name += " ("+ (++nameCache[name]) +")";
    }

    var img = zip.folder(name);

    var css = img.folder("css");
        css.file("index.css", projectStructure.css["index.css"]);

    var js = img.folder("js");
        js.file("index.js", code);
        js.file("loadKa.js", projectStructure.js["loadKa.js"]);

    var libraries = img.folder("libraries");
        libraries.file("processing.js", projectStructure.libraries["processing.js"]);

    img.file("index.html", projectStructure["index.html"].replace("Processing Js", nameSp || ""));

    if(elementJson)
    {
        img.file("info.json", elementJson);
    }
}

function alignCode(code)
{
    return "function main()\n{\n\n" + code.toString() + "\n\n}\n\ncreateProcessing(main);";
}

function extractCodeJson(str)
{
    return JSON.parse(str.substring(str.indexOf("children: ReactComponent(") + 25, 
                                    str.indexOf(", document.getElementById(\"tutorial-content\"))") - 8));
}

function nextString(name) 
{ 
    var out = name.match("([0-9]+)");

    if(out && !isNaN(Number(out[0])))
    {
        console.log(true);
        name = name.replace(" (" + out[0] + ")", " (" + (Number(out[0]) + 1).toString() + ")");
    }else{
        name += " (1)";
    }

    return name;
}
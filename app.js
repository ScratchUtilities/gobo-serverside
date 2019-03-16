// URL shortener
function longUrl(hash) {
  var urlStarts = {
    u: "https://scratch.mit.edu/users/",
    p: "https://scratch.mit.edu/projects/",
    e: "editor",
    s: "https://scratch.mit.edu/studios/",
    d: "https://scratch.mit.edu/discuss/topic/",
    o: "https://scratch.mit.edu/discuss/post/"
  };
  var type = urlStarts[hash[1]];
  if (type == "https://scratch.mit.edu/users/") {
    return type + hash.substring(2);
  } else {
    if (type == "editor") {
      return (
        "https://scratch.mit.edu/projects/" +
        base64.decode(hash.substring(2)) +
        "/editor"
      );
    } else {
      return type + base64.decode(hash.substring(2));
    }
  }
}

function shortenUrl(url) {
  //console.log(url, typeof url)
  if (url.includes("scratch.mit.edu/")) {
    var split = url
      .substring(url.indexOf("scratch.mit.edu/") + 16, url.length)
      .split("/");
    var types = {
      users: "u",
      projects: "p",
      studios: "s",
      discuss: "d"
    };
    var id;
    var type = types[split[0]];
    if (split[0] == "discuss") {
      id = split[2];
      if (split[1] === "post") {
        // post
        type = "o";
      }
      if (url.includes("#")) {
        // topic, but with post hash
        console.log(url.split("#")[1].substring(5));
        return (
          "http://gobo.cf/o" + base64.encode(url.split("#")[1].substring(5))
        );
      }
    } else {
      id = split[1];
    }
    if (type != "u") {
      id = base64.encode(id);
    }
    if (type == "p" && split[2] == "editor") {
      return "http://gobo.cf/e" + id;
    } else {
      return "http://gobo.cf/" + type + id;
    }
  } else if (url === "") {
    return "";
  } else {
    return "Invalid URL";
  }
}

const base64 = {
  charset: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_".split(
    ""
  ),
  encode: integer => {
    if (integer === 0) {
      return "0";
    }
    var s = [];
    while (integer > 0) {
      s.push(base64.charset[integer % 64]);
      integer = Math.floor(integer / 64);
    }
    s.reverse();
    return s.join("");
  },
  decode: chars =>
    chars
      .split("")
      .reverse()
      .reduce(
        (prev, curr, i) =>
          prev + base64.charset.indexOf(curr) * Math.pow(64, i),
        0
      )
};

function spawnUser(contents) {
  var html = [];
  var object;
  var a;
  var img;
  var div;
  for (i = 0; i < contents["content-order"].length; i++) {
    if (contents["content-order"][i] === "br") {
      html.push("<br/>");
    } else {
      object = contents["content"][contents["content-order"][i]];
      img =
        '<img src="https://avatars3.githubusercontent.com/u/' +
        object.userid +
        '" class="contrib-user-pic' +
        (object.team ? " contrib-user-pic-big" : "") +
        '"/>';
      div = '<div class="contrib-user-name">' + object.username + "</div>";
      a =
        '<a class="contrib-user" href=' +
        object.link +
        ">" +
        img +
        div +
        "</a>";
      html.push(a);
    }
  }
  return html.join("");
}

// Web server
const http = require("http");
const fs = require("fs");
const querystring = require("querystring");

const hostname = "127.0.0.1";
const port = process.env.port || 80;

function decodeURIcomponent(str) {
  return querystring.unescape(str.replace(/\+/g, " ")); // replace every `+' with ` ' manually.
}

function HTMLescape(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ready() {
  var key;
  for (key in files) {
    console.log("ready to send", key);
  }
  const server = http.createServer((req, res) => {
    console.log("request to", req.url);
    if (req.url.substring(0, 7) === "/?long=") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(
        files["_query"]
          .replace("{input}", decodeURIcomponent(req.url.substring(7)))
          .replace(
            "{output}",
            shortenUrl(decodeURIcomponent(req.url.substring(7)))
          )
      );
    } else if ("upesdo".indexOf(req.url[1]) >= 0) {
      res.statusCode = 307; // Temporary Redirect?
      res.setHeader("Location", longUrl(req.url.split("?")[0]));
      res.end();
    } else if (req.url.split("?")[0] === "/favicon.ico") {
      res.statusCode = 308; // Permenant Redirect
      res.setHeader("Location", "/gobo.ico");
      res.end();
    } else if (files[req.url.split("?")[0]]) {
      res.statusCode = 200;
      res.setHeader("Content-Type", types[req.url.split("?")[0]]);
      res.end(files[req.url.split("?")[0]]);
    } else {
      res.statusCode = files["_404"];
      res.setHeader("Content-Type", "text/html");
      res.end(files["_404"]);
    }
  });

  server.listen(port, hostname, () => {
    console.log("Server running at http://$" + hostname + ":$" + port + "/");
  });
}

var loading = 0;
var files = {};
var types = {};
function load(src, name, type, fun) {
  loading++;
  console.log("loading", src, "a", type);
  fs.readFile("files/" + src, function(err, contents) {
    if (err) {
      throw err;
    }
    loading--;
    console.log("loaded", src, "to", name);
    files[name] = fun
      ? fun(contents.toString()) || contents.toString()
      : contents.toString();
    types[name] = type;
    if (loading <= 0) {
      ready();
    }
  });
}

function setup() {
  var firstLoad = null;
  var secondLoad = null;
  load("about/index.html", "/about/", "text/html", function(contents) {
    if (firstLoad) {
      return contents.replace("{contribs}", files.contribs);
    } else {
      firstLoad = false;
    }
  }); // two versions for with and without slash at end.
  load("about.html", "/about", "text/html", function(contents) {
    if (secondLoad) {
      return contents.replace("{contribs}", files.contribs);
    } else {
      secondLoad = false;
    }
  });
  load("index.html", "/", "text/html");
  load("query.html", "_query", "text/html");
  load("404.html", "_404", "text/html");
  load("style.css", "/_files/style.css", "text/css");
  load("query.css", "/_files/query.css", "text/css");
  load("goboWhite.png", "/_files/goboWhite.png", "image/png");
  load("gobo-color.svg", "/_files/gobo-color.svg", "image/svg+xml");
  load("gobo-a.png", "/_files/gobo-a.png", "image/png");
  load("gobo.ico", "/gobo.ico", "icon");
  // load and convert to html, contribUsers.json, pure json
  loading++;
  console.log("loading contribUsers.json");
  fs.readFile("files/contribUsers.json", function(err, contents) {
    if (err) {
      throw err;
    }
    console.log("loaded contribUsers.json. Converting to HTML.");
    files.contribs = spawnUser(JSON.parse(contents));
    loading--;
    if (firstLoad === false) {
      files["/about/"] = files["/about/"].replace("{contribs}", files.contribs);
    } else {
      firstLoad = true;
    }
    if (secondLoad === false) {
      files["/about"] = files["/about"].replace("{contribs}", files.contribs);
    } else {
      secondLoad = true;
    }
    if (loading <= 0) {
      ready();
    }
  });
}
setup();

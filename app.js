/* "BIG BOARD" Kiosk backend server
 * 
 * Mostly this is handling Socket.io requests on client iPad(s) and then relaying those requests to the "Big Board" kiosk
 * This is similar to the Thought_Board project, but it only uses user input to present data, rather than users inputting.
 * 
 * TWO ENDPOINTS for HTML:
 * 	Clients just go to root endpoint of server (/) to get the client.html page.
 * 	The "Big Board" main kiosk screen will endpoint at "/kiosk" to get the kiosk.html page.
 * 
 * DATA ENDPOINT:
 * 	"/data" will give out the configuration JSON data which defines what sites/data/imagery 
 * 
 * ASSETS:
 * 	Video, Background images, icons, etc will all be served out of "/assets" like a vanilla http server.
 * 
 */
 
 
//DEPENDENCIES. use NPM.
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var getJSON = require("get-json");
var fs = require("fs");
var deepEqual = require("deep-equal");

//global object to store most recent api/config data for comparing with new fetches
var DATA = '';

var daydreamtimeout = 120 //seconds for a random background change to initiate if the background hasn't been changed by user input.
var backgroundDaydream = daydreamtimeout;
//Root endpoint returns client.html for client iPads and what not.
app.get('/', function(req, res){
	res.sendFile(__dirname + '/client.html');
});


//Return kiosk.html for the main display/kiosk/"Big board"
app.get('/kiosk', function(req, res){
	res.sendFile(__dirname + '/kiosk.html');
});


//serve static assets out of assets folder...the clients/kiosk(s) see these as on the ROOT.
app.use(express.static('assets'));


//Called by clients and kiosks upon initial page load to get started.
app.get('/data', function(req, res){
	/*getData(function(err,data){
		if(err)
		{
			res.send(err);
		}
		else
		{
			res.send(data);
			checkData();
		}
	});
	*/
	res.send(DATA);
	
});

//every 5 minutes check all data (config and data API) and evaluate for changes. If changes, tell clients and kiosks so they can rewrite the pertinent data.
setInterval(function(){
	checkData();
},300000);

function checkData(callback){
	console.log("Checking for data changes...")
	getData(function(err,data){
		if(err)
		{
			console.log(err);
		}
		if(DATA && (Object.keys(DATA).length == Object.keys(data).length))
		{
			for(site in data)
			{
				if(!deepEqual(data[site],DATA[site]))
				{
					console.log("change in data for site " + site);
					io.emit("updatedData",site,data[site]);
				}
			}
			DATA = data;
		}
		else
		{
			DATA = data;
		}
		console.log("done.")
	});
}

//async function to collect and figure what data goes where using Today at the Park Data API and configuration JSON. Called by pages calling /data endpoint on load, and also by a setInterval to check for changes in all the data.
function getData(callback) {
	var data = '';
	//first load up local configure file.
	fs.readFile('data.json','utf-8',function(err,config){
		if(err)
		{
			 callback("Error - data.json config file does not exist." +  err,"")
		}
		else
		{
			try
			{
				data = JSON.parse(config)
				getJSON("https://bostonnpsevents.com/tap/json.cgi", function(err,apiJson){
					if(err)
						console.log(err)
					else
					{
						//If local and API Json gets in correctly, we are here. now work on associating TAP API with sites defined in config file
						for(site in data)//iterate through all the sites in config.
						{
							if(site == "default")
							{
								continue;
							}
							for(var i = 0; i < data[site].subSites.length; i++)//iterate through each subsite nested under main sites defined in config
							{
								for(var j = 0; j < apiJson.sites.length; j++)//for each site defined in data API...
								{
									//console.log(data[site].subSites[i].abbr)
									if(apiJson.sites[j].abbr == data[site].subSites[i].abbr)
									{
										//if we have a matching subSite abbr to data API abbr, append that site defining data to the subSite object.
										data[site].subSites[i]["data"] = apiJson.sites[j];
										break;
									}
								}
							}
							//add an events array
							data[site].events = [];
							for(var i = 0; i < data[site].subSites.length; i++)//iterate through each subsite nested under main sites defined in config
							{
								for(var j = 0; j < data[site].subSites[i].data.locations.length; j++)//iterate through each subsite nested under main sites defined in config
								{
									for(event in apiJson.events)
									{
										if(apiJson.events[event].location == data[site].subSites[i].data.locations[j])
										{
											data[site].events.push(apiJson.events[event])
										}
									}
								}
							}
						}
					}
					callback("",data);
				});
			}
			catch(err)
			{
				callback("Configuration error in data.json: " + err.message);
			}
		}
	});
}


//Handle Socket.io. This is where the magic happens with handling user interaction.
var clientID = 0;
io.on('connection', function(socket){
	var client = clientID++; //every connection increments a "client ID" this is for feedbacking to multiple ipads which one requested the video
	socket.send(client);
	socket.on('viewSite', function(site){
		io.emit('kioskViewSite',site)
	});
	socket.on('startVideo', function(id){
		io.emit('kioskStartVideo',id)
	});
	socket.on('videoEnd', function(){
		io.emit('videoEnd','')
	});
	socket.on('timestamp', function(ts){
		io.emit('timestamp',ts)
	});
	socket.on('setBackground', function(site, iter){
		console.log("setting background to " + site + " array item " + iter);
		io.emit('setBackground',site,iter)
		backgroundDaydream = daydreamtimeout;
	});

});

setInterval(function(){
	backgroundDaydream--;
	if(backgroundDaydream == 0)
	{
		var keys = Object.keys(DATA)
		var key = keys[parseInt(Math.random()*keys.length)]
		var background = parseInt(Math.random())*DATA[key].backgrounds.length
		io.emit('setBackground',key,background)
		backgroundDaydream = daydreamtimeout;
	}
},1000)

checkData();
http.listen(80, function(){
  console.log('listening on *:80');
});

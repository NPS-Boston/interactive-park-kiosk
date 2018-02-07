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


//Return client.html for client iPads and what not.
app.get('/', function(req, res){
	res.sendFile(__dirname + '/client.html');
});


//Return kiosk.html for the main display/kiosk/"Big board"
app.get('/kiosk', function(req, res){
	res.sendFile(__dirname + '/kiosk.html');
});


//serve static assets out of assets folder...the clients/kiosks see these as on the ROOT.
app.use(express.static('assets'));


//Dynamically figure what data goes where using Today at the Park Data API and configuration JSON.
app.get('/data', function(req, res){
	var data = ''
	//first load up local configure file.
	fs.readFile('data.json','utf-8',function(err,config){
		if(err)
		{
			 res.send("Error - data.json config file does not exist." +  err)
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
					res.send(data);
				});
			}
			catch(err)
			{
				res.send("Configuration error in data.json: " + err.message);
			}
		}
	});
});


//Handle Socket.io. This is where the magic happens with handling user interaction.
var clientID = 0;
io.on('connection', function(socket){
	var client = clientID++; //every connection increments a "client ID" this is for feedbacking to multiple ipads which one requested the video
	socket.send(client);
	socket.on('viewSite', function(submission){
		io.emit('kioskViewSite',submission)
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

});

http.listen(80, function(){
  console.log('listening on *:80');
});

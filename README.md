# interactive-park-kiosk
Combines Today at the Park Data API with maps and social media in a kiosk that can be manipulated via an iPad.

Current deployment plan: three portrait 1080p screens on a wall each featuring different information and an iPad in a kiosk stand
Left: Today at the Park data API represented in some fancy user friendly way. Maybe Weather too?
Center: Map of Boston using npmap and custom tileset
Right: Twitter/social media feed of all the partners

iPad(s?): Place in standlaone kiosk mount. Represent sites or events in a useful way, and use Socket.io to emit user actions to highlight information on the main kiosk display.

Each screen will have its own endpoint responding with an HTML page: TAP, map, social_media, ipad. This means each screen will be its own instance of a browser (or, perhaps, you could iFrame each one to specific sizes).

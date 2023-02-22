
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

$(document).ready(function() {
    let myMarkers = [];

    console.log("help me");

    mapboxgl.accessToken = MAPBOX_API_KEY;

    let mapboxGeocoder = undefined;

    const map = new mapboxgl.Map({
        container: "my-map",
        style: "mapbox://styles/mapbox/streets-v10",
        zoom: 8
    });

    geocode("San Antonio TX", MAPBOX_API_KEY)
        .then(function(lngLat) {
            addMarkerForLngLat(lngLat, true, "San Antonio TX");
    }).catch(function(error) {
        console.log("Error: " + error);
    }).finally(function() {
        // Add the control to the map.
        mapboxGeocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            flyTo: false,
            marker: false
        });
        map.addControl(mapboxGeocoder);
        // mapboxGeocoder.off("result");
        mapboxGeocoder.on("result", function(result) {
            // result.preventDefault();
            // console.log(result)
            // console.log(result.result.center);
            addMarkerForLngLat(result.result.center, true, result.result.place_name)
        });
    });


    let commandKeyDown = false;
    // drop a marker and popup wherever the user Command+clicks
    $(document).on('keydown', function(e) {
        commandKeyDown = e.metaKey;
    });
    $(document).on('keyup', function(e) {
        commandKeyDown = e.metaKey;
    });
    map.on('click', function(e) {
        // e.preventDefault();
        if(commandKeyDown) {
            // console.log(e.lngLat);
            const myLngLat = [e.lngLat.lng, e.lngLat.lat];
            addMarkerForLngLat(myLngLat);
        }
    });

    // lngLat is an array of long then lat
    // i.e., [ longitude, latitude ]
    function addMarkerForLngLat(lngLat, jumpTo = false, address = undefined) {
        const marker = new mapboxgl.Marker({
            draggable: true
        });
        myMarkers.push(marker);
        marker.setLngLat(lngLat);
        marker.addTo(map);

        marker.on("dragend", function() {
            changeMarkerPopup(this);
            detectAndDestroy(this);
        });

        changeMarkerPopup(marker, address);

        if(jumpTo) {
            map.jumpTo({
                zoom: 8,
                center: lngLat
            });
        }

    }

    function changeMarkerPopup(marker, address = undefined) {
        const lngLat = marker.getLngLat();
        const popup = new mapboxgl.Popup();
        marker.setPopup(popup);

        reverseGeocode(lngLat, MAPBOX_API_KEY)
            .then(async function (fullAddress) {
                $("#loading-img").removeClass("d-none");
                let html = "";
                if (address) {
                    html = `<h6>${address}</h6>`;
                }
                html += `<p>${fullAddress}</p>`;

                // go get the forecast for the pin
                const weatherData = await getWeatherData(lngLat);
                html += `<ul><li>${getDayOfWeek(weatherData.list[0].dt)} ${weatherData.list[0].main.temp} &#8457</li>`;
                html += `<li>${getDayOfWeek(weatherData.list[8].dt)} ${weatherData.list[8].main.temp} &#8457</li>`;
                html += `<li>${getDayOfWeek(weatherData.list[16].dt)} ${weatherData.list[16].main.temp} &#8457</li>`;
                html += `<li>${getDayOfWeek(weatherData.list[24].dt)} ${weatherData.list[24].main.temp} &#8457</li>`;
                html += `<li>${getDayOfWeek(weatherData.list[32].dt)} ${weatherData.list[32].main.temp} &#8457</li></ul>`;
                popup.setHTML(html);
                // marker.togglePopup();
            }).finally(function() {
                $("#loading-img").addClass("d-none");
        });

    }

    async function getWeatherData(lngLat) {
        return await $.get(`https://api.openweathermap.org/data/2.5/forecast`, {
                APPID: OPENWEATHER_API_KEY,
                lat: lngLat.lat,
                lon: lngLat.lng,
                units: "imperial"
            });
    }

    function getDayOfWeek(unixTimestamp) {
        // console.log(data.daily[0].dt);
        const d = new Date(unixTimestamp * 1000);
        let day = d.getDay();
        return DAYS_OF_WEEK[day];
    }

    function detectAndDestroy(src) {
        for (let i = myMarkers.length - 1; i >= 0; i--) {
            dest = myMarkers[i];
            if(dest === src) {
                continue;
            }
            let aLine = {
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': []
                }
            };
            aLine.geometry.coordinates = [
                [src.getLngLat().lng, src.getLngLat().lat],
                [dest.getLngLat().lng, dest.getLngLat().lat]
            ];

            // console.log(aLine);

            const distance = turf.length(aLine, {units: 'miles'});
            // console.log(distance);

            if(distance < 6.0) {
                doDeathScene(src, dest);
            }
        }
    }

    async function doDeathScene(hero, villain) {
        let popup = new mapboxgl.Popup();
        popup.setHTML("<h3>I keel you</h3>");
        hero.setPopup(popup);
        hero.togglePopup();
        await timeout(3000);
        if(popup.isOpen()) {
            hero.togglePopup();
        }

        if(Math.random() < .5) {
            popup = new mapboxgl.Popup();
            popup.setHTML("<h3>I am slain</h3>");
            villain.setPopup(popup);
            villain.togglePopup();
            await timeout(3000);
            if(popup.isOpen()) {
                villain.togglePopup();
            }

            villain.remove();
        } else {
            popup = new mapboxgl.Popup();
            popup.setHTML("<h3>HA! You missed.</h3>");
            villain.setPopup(popup);
            villain.togglePopup();
            await timeout(3000);
            if(popup.isOpen()) {
                villain.togglePopup();
            }

        }

    }

    // from https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

});

var topojsonUrl = 'https://jsonp.afeld.me/?url=http%3A%2F%2Fbl.ocks.org%2Fmbostock%2Fraw%2F4090846%2Fus.json';
var tweetIndex = 0,
  GROUP_MS = 60 * 60 * 1000,
  TWEET_SIZE = 6,
  TIME_BAR_HEIGHT = 40,
  FROM_COLOR = [190, 190, 190],
  TO_COLOR = [255, 0, 26],
  play = false,
  TIME_WINDOW = 7 * 24 * 60 * 60 * 1000;

var timeline = {}, data, usJSON, dataGroupedByTime, timeInt, startTimeInt, endTimeInt,
  timeWidth, colorFromArray, intAmount, intFadeColor, timeInfoElement;

var UNITED_STATES = {
  top: 55,
  bottom: 20,
  left: -130,
  right: -60
};

UNITED_STATES = {
  top: 49.3457868,
  bottom: 24.7433195,
  left: -124.7844079,
  right: -66.9513812
};

var WORLD = {
  top: 90,
  bottom: -90,
  left: -180,
  right: 180
};

var TWEET_OFFSET = 973;

var bounds = UNITED_STATES;

var tagsToPlot = ['DEPRESSED', 'DEPRESSION', 'SUICIDAL', 'SUICIDE'];

function preload(){
  data = loadJSON('./data/all-data-with-coords.json');
  // usJSON = loadJSON(topojsonUrl);
  colorFromArray = _.spread(color);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  var grid = calcGridSize(data);
  mapWidth = grid * 360;
  mapHeight = grid * 180;

  colorMode(RGB);

  dataGroupedByTime = groupTweetsByTime(data);
  startTimeInt = timeInt = _.toNumber(_(dataGroupedByTime).keys().min()) + TWEET_OFFSET;
  endTimeInt = _.toNumber(_.max(_.keys(dataGroupedByTime)));
  // endTimeInt = startTimeInt + 1000;
  timeWidth = width/(endTimeInt - startTimeInt);
  intAmount = GROUP_MS/TIME_WINDOW;
  intFadeColor = colorFromArray(fadeColor([255, 255, 255], intAmount));

  timeInfoElement = new p5.Element(document.createElement('div'));
  timeInfoElement.parent('time-info');
}

function draw() {
  var mouseTime = getMouseTime(mouseX, mouseY);
  if(_.isEmpty(mouseTime) && play){
    // fadeOverTime();
    if(timeInt > endTimeInt){
      return;
    }
    mapAtTime(timeInt);
    timeInt ++;
  } else if(!_.isEmpty(mouseTime)){
    clear();
    mapAtTime(mouseTime);
    timeInt = mouseTime;
  }
}

function mousePressed(){
  togglePlayState();
}

function togglePlayState(){
  play = !play;
}

function stop(){
  play = false;
}

function fadeOverTime(){
  blendMode(SCREEN);
  noStroke();
  fill(intFadeColor);
  rect(0, 0, width, height);
  blendMode(BLEND);
}

function calcGridSize(tweets){
  var mapBounds = getMapBounds(tweets);
  gridHeight = (height - TIME_BAR_HEIGHT)/(mapBounds.latMax - mapBounds.latMin);
  gridWidth = width/(mapBounds.longMax - mapBounds.longMin);

  grid = _.min([gridHeight, gridWidth]);
  return grid;
}

function getMapBounds(tweets){
  var lats, longs;
  lats = _.map(tweets, _.property('Lat'));
  longs = _.map(tweets, _.property('Lon'));
  latMin = _.min(lats);
  latMax = _.max(lats);
  longMin = _.min(longs);
  longMax = _.max(longs);

  return {latMin: latMin, latMax: latMax, longMin: longMin, longMax: longMax};
}

function mapAtTime(currentTimeInt){
  showTime(currentTimeInt);
  updateTimeInfo(currentTimeInt);
  _.map(dataGroupedByTime[currentTimeInt], drawTweet);
}

function showTime(currentTimeInt){
  var averageNeg;
  var timeX = map(currentTimeInt, startTimeInt, endTimeInt, 0, width);
  var barHeight = 2;

  if(_.isEmpty(dataGroupedByTime[currentTimeInt])){
    fill(fadeColor([0,0,0], 0.1));
    stroke(fadeColor([0,0,0], 0.1));
  }else{
    averageNeg = averageSentiment(dataGroupedByTime[currentTimeInt]);
    barHeight = dataGroupedByTime[currentTimeInt].length;
    sentimentColor = lerpColor(colorFromArray(FROM_COLOR), colorFromArray(TO_COLOR), averageNeg);

    fill(sentimentColor);
    stroke(sentimentColor);
  }
  timebox = {x: timeX, y: height - barHeight, width: timeWidth, height: barHeight};
  timeline[currentTimeInt] = {
    left: timebox.x,
    right: timebox.x + timebox.width,
    top: _.min([timebox.y, height - TIME_BAR_HEIGHT]),
    bottom: height
  };

  // noStroke();
  rect(timebox.x, timebox.y, timebox.width, timebox.height);
}

function getMouseTime(x, y){
  var mouseTime = _(timeline).pickBy(function(timebound){
    return inBounds(x, y, timebound);
  }).keys().first();
  return mouseTime;
}

function updateTimeInfo(currentTimeInt){
  var date = '<h1 class="date">'+ moment(currentTimeInt * GROUP_MS).format('YYYY, MMM D') + '</h1>';
  var day = '<i class="day">' + moment(currentTimeInt * GROUP_MS).format('ddd') + '</i>';
  var time = '<i class="time">' + moment(currentTimeInt * GROUP_MS).format('hh:mm:ss a') + '</i>';

  timeInfoElement.html(date + day + time);
}

function averageSentiment(tweets){
  return _(tweets).map(_.property('Neg')).mean();
}

function getTweetsUpToTimeInt(groupedTweets, currentTimeInt){
  return _(groupedTweets).filter(function(tweetsInInt, intKey){
    return intKey <= currentTimeInt && intKey >= currentTimeInt - TIME_WINDOW;
  }).flatten().value();
}

function groupTweetsByTime(tweets){
  return _(tweets).groupBy(function(tweet){
    var timeInMS = new Date(tweet.Date).valueOf();
    var mapped = remapLatLong(tweet.Lat, tweet.Lon);
    _.extend(tweet, mapped);

    return Math.floor(timeInMS/GROUP_MS) * (_.includes(tagsToPlot, tweet.Tag)? 1:0) * (isTweetInBounds(tweet, bounds)? 1:0);
  }).omit(0).value();
}

function isTweetInBounds(tweet, boundingBox){
  return inBounds(tweet.Lon, tweet.Lat, boundingBox);
}

function inBounds(x, y, boundingBox){
  return _.inRange(y, boundingBox.bottom, boundingBox.top) && _.inRange(x, boundingBox.left, boundingBox.right);
}

function showTweet(tweetIndex){
  console.info(data[tweetIndex]);
}

function drawTweet(tweet){
  if(tweet.Neg){
    fill(colorFromArray(fadeColor(TO_COLOR, 0.75)));
    stroke(colorFromArray(TO_COLOR));
  } else {
    fill(colorFromArray(fadeColor(FROM_COLOR, 0.75)));
    stroke(colorFromArray(fadeColor(FROM_COLOR, 1)));
  }
  return ellipse(tweet.x, tweet.y, grid, grid);
}

function remapLatLong(lat, long){
  var mappedLat = map(lat, bounds.bottom, bounds.top, mapHeight, 0);
  var mappedLong = map(long, bounds.left, bounds.right, 0, mapWidth);
  return {y: mappedLat, x: mappedLong};
}

function fadeColor(rgbArray, fadeAlpha){
  if(_.isArray(rgbArray)){
    return _.concat(rgbArray, fadeAlpha * 255);
  } else if (rgbArray instanceof p5.Color){
    return colorFromArray(_.concat(_.dropRight(rgbArray.levels, 1), fadeAlpha * 255));
  }
}

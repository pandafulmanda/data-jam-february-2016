var topojsonUrl = 'https://jsonp.afeld.me/?url=http%3A%2F%2Fbl.ocks.org%2Fmbostock%2Fraw%2F4090846%2Fus.json';
var tweetIndex = 0,
  GROUP_MS = 60 * 60 * 1000,
  TWEET_SIZE = 6,
  TIME_BAR_HEIGHT = 40,
  FROM_COLOR = [80, 80, 80],
  TO_COLOR = [255, 0, 26],
  play = true,
  TIME_WINDOW = 1 * 24 * 60 * 60 * 1000;

var timeline = {}, data, selectedTime, dataGroupedByTime, timeInt, startTimeInt, endTimeInt,
  timeWidth, colorFromArray, intFadeColor, timeInfoElement, detailsElement, showDetail;

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
  setTimeBoxes();

  intFadeColor = colorFromArray(fadeColor([255, 255, 255], GROUP_MS/TIME_WINDOW));

  timeInfoElement = new p5.Element(document.createElement('div'));
  timeInfoElement.parent('time-info');
}

function draw() {
  selectedTime = getMouseTime(mouseX, mouseY);
  if(!selectedTime && play){
    if(timeInt > endTimeInt){
      return;
    }
    fadeOverTime();
    mapAtTime(timeInt);
    timeInt ++;
  } else if(selectedTime){
    clear();
    mapAtTime(selectedTime);
    timeInt = selectedTime;
  }
}

function mousePressed(){
  if(selectedTime){
    stop();
  } else {
    togglePlayState();
  }
}

function togglePlayState(){
  play = !play;
}

function stop(){
  play = false;
}

function fadeOverTime(){
  blendMode(REPLACE);
  noStroke();
  fill(intFadeColor);
  rect(0, 0, width, height);
  // blendMode(BLEND);
}

function calcGridSize(tweets){
  var mapBounds = getMapBounds(tweets);
  gridHeight = (height - TIME_BAR_HEIGHT)/(mapBounds.latMax - mapBounds.latMin);
  gridWidth = width/(mapBounds.longMax - mapBounds.longMin);

  grid = _.min([gridHeight, gridWidth]);
  return grid;
}

function getMapBounds(tweets){
  var lats = _.map(tweets, _.property('Lat'));
  var longs = _.map(tweets, _.property('Lon'));
  latMin = _.min(lats);
  latMax = _.max(lats);
  longMin = _.min(longs);
  longMax = _.max(longs);

  return {latMin: latMin, latMax: latMax, longMin: longMin, longMax: longMax};
}

function showDetails(currentTimeInt){
  var tweets = dataGroupedByTime[currentTimeInt];
  var tweetsHTML = _.map(tweets, showDetail).join('');
  detailsElement.html(tweetsHTML);
  detailsElement.elt.parentNode.classList.add('active');
}

function makeDetail(){
  var itemWrapper = document.createElement('li');
  var tweetElement = document.createElement('blockquote');
  var timeElement = document.createElement('i');
  var topicElement = document.createElement('p');

  itemWrapper.classList.add('detail');
  tweetElement.classList.add('detail-tweet');
  timeElement.classList.add('detail-time');
  topicElement.classList.add('detail-topic');

  itemWrapper.appendChild(topicElement);
  itemWrapper.appendChild(tweetElement);
  itemWrapper.appendChild(timeElement);

  return function showDetail(tweet){
    var tweetItem = itemWrapper.cloneNode(true);
    tweetItem.children[0].innerHTML = _.capitalize(tweet.Tag);
    tweetItem.children[1].innerHTML = tweet.Tweet;
    tweetItem.children[2].innerHTML = tweet.Date;

    return tweetItem.outerHTML;
  };
}

function mapAtTime(currentTimeInt){
  showTime(currentTimeInt);
  updateTimeInfo(currentTimeInt);
  _.map(dataGroupedByTime[currentTimeInt], drawTweet);
}

function setTimeBoxes(){
  var timeIntRange = _.range(startTimeInt, endTimeInt + 1, 1);

  _.each(timeIntRange, function(currentTimeInt){
    var barHeight = 2;
    if(!_.isEmpty(dataGroupedByTime[currentTimeInt])){
      barHeight = dataGroupedByTime[currentTimeInt].length;
    }

    var timeX = map(currentTimeInt, startTimeInt, endTimeInt, 0, width);
    var timebox = {x: timeX, y: height - barHeight, width: timeWidth, height: barHeight};
    timeline[currentTimeInt] = {
      left: timebox.x,
      right: timebox.x + timebox.width,
      top: _.min([timebox.y, height - TIME_BAR_HEIGHT]),
      bottom: height
    };
    _.extend(timeline[currentTimeInt], timebox);
  });
}

function showTime(currentTimeInt){
  var averageNeg;

  if(_.isEmpty(dataGroupedByTime[currentTimeInt])){
    fill(fadeColor([0,0,0], 0.1));
    stroke(fadeColor([0,0,0], 0.1));
  }else{
    averageNeg = averageSentiment(dataGroupedByTime[currentTimeInt]);
    sentimentColor = lerpColor(colorFromArray(FROM_COLOR), colorFromArray(TO_COLOR), averageNeg);

    fill(sentimentColor);
    stroke(sentimentColor);
  }

  // noStroke();
  rect(timeline[currentTimeInt].x, timeline[currentTimeInt].y, timeline[currentTimeInt].width, timeline[currentTimeInt].height);
}

function getMouseTime(x, y){
  return _(timeline).pickBy(function(timebound){
    return inBounds(x, y, timebound);
  }).keys().first() || false;
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

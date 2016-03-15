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

  detailsElement = new p5.Element(document.createElement('ul'));
  detailsElement.parent('details');
  detailsElement.elt.parentNode.style = 'height: ' + height + 'px;';
  detailsElement.html(makeBlankDetails());
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

function keyPressed() {
  if (keyCode === DOWN_ARROW) {
    togglePlayState();
  } else if (keyCode === LEFT_ARROW) {
    stop();
    timeInt --;
    fadeOverTime();
    mapAtTime(timeInt);
    showDetails();
  } else if (keyCode === RIGHT_ARROW) {
    stop();
    timeInt ++;
    fadeOverTime();
    mapAtTime(timeInt);
    showDetails();
  }
}

function mousePressed(){
  if(selectedTime){
    stop();
    showDetails();
  } else {
    togglePlayState();
    if (!play) {
      hideDetails();
    }
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

function showDetails(){
  // updateDetails(currentTimeInt);
  detailsElement.elt.parentNode.classList.add('active');
}

function updateDetails(currentTimeInt){
  var tweets = dataGroupedByTime[currentTimeInt];
  var tweetsGroupsByTopic = _.groupBy(tweets, 'Tag');
  var tweetsByTopic = _.mapValues(tweetsGroupsByTopic, 'length');
  var tweetsByNeg = _(['neg', 'neutral'])
    .zipObject(_.partition(tweets, function(tweet){ return tweet.Neg === 1;}))
    .mapValues('length')
    .value();

  var tweetsByHash = {};

  _.each(tweets, function(tweet){
    var hashtags = tweet.Tweet.match(/[#]+[A-Za-z0-9-_]+/g);
    _.each(hashtags, function(hashtag){
      tweetsByHash[hashtag] = tweetsByHash[hashtag] || 0;
      tweetsByHash[hashtag]++;
    });
  });


  updatePieChart(tweetsByTopic);
  updatePieChart(tweetsByNeg);
  updateTotalLabel(tweetsByTopic);
  updateHashTagsList(tweetsByHash);
}

function makeBlankDetails(){
  var details = [makeBlankTotalLabel(), makeBlankPieChartForTerms(), makeBlankPieChartForNeg(), makeBlankHashTagsList()];

  return _.map(details, _.property('outerHTML')).join('');
}

function updateTotalLabel(parts){
  var total = _(parts).values().sum();
  var countElement = document.getElementById('total-tweets-count');
  countElement.innerHTML = total;
}

function updateHashTagsList(tweetsByHash){
  var hashtagsElement = document.getElementById('hashtags');
  var hashtagEl = document.createElement('label');
  var hashes = _.map(tweetsByHash, function(count, hashtag){
    var hashTagLabel = hashtagEl.cloneNode();
    hashTagLabel.dataset.term = hashtag;
    hashTagLabel.innerHTML = '<strong>' + count + '</strong>';
    return hashTagLabel.outerHTML;
  });
  hashtagsElement.innerHTML = hashes.join('');
}

function makeBlankHashTagsList(){
  var wrapper = document.createElement('li');
  var heading = document.createElement('h2');
  var labels = document.createElement('div');

  labels.id = 'hashtags';
  heading.innerHTML = 'Topics/Hashtags'
  wrapper.appendChild(heading);
  wrapper.appendChild(labels);
  return wrapper;
}

function makeBlankTotalLabel(){
  var wrapper = document.createElement('li');
  var heading = document.createElement('h2');
  heading.innerHTML = 'Total: <i id="total-tweets-count"></i>'
  wrapper.appendChild(heading);
  return wrapper;
}

function makeBlankPieChartForNeg(){
  var parts = { neg: 0, neutral: 0};

  return makePieChart(parts, 'Tweets by Neg');
}

function makeBlankPieChartForTerms(){
  var parts = {};

  _.each(tagsToPlot, function(tag){
    parts[tag] = 0;
  });

  return makePieChart(parts, 'Tweets by topic');
}

function updatePieChart(parts){
  var partsEls = makePieProperties(parts);

  _.each(partsEls, function(partEl){
    var piePiece = document.querySelector('.pie[data-term=' + partEl.partFor + ']');
    var label = document.querySelector('label[data-term=' + partEl.partFor + ']');
    piePiece.style.strokeDasharray = partEl.dash;
    label.innerHTML = '<strong>' + partEl.count + '</strong>';
  });
}

function makePieChart(parts, title){
  var wrapper = document.createElement('li');
  var heading = document.createElement('h2');
  var chart = document.createElement('svg');
  chart.classList.add('chart');

  var pieceElement = document.createElement('circle');
  pieceElement.classList.add('pie');
  pieceElement.setAttribute('r', 25);
  pieceElement.setAttribute('cx', 50);
  pieceElement.setAttribute('cy', 50);

  var labelsElement = document.createElement('label');
  var labelsWrapper = document.createElement('div');
  labelsWrapper.classList.add('pie-labels');

  var partsEls = makePieProperties(parts);

  var pieces = _.map(partsEls, function(partEl){
    var piece = pieceElement.cloneNode();
    piece.style.strokeDasharray = partEl.dash;
    piece.dataset.term = partEl.partFor;
    return piece.outerHTML;
  });

  var labels = _.map(partsEls, function(partEl){
    var label = labelsElement.cloneNode();
    label.dataset.term = partEl.partFor;
    label.innerHTML = '<strong>' + partEl.count + '</strong>';
    return label.outerHTML;
  });

  labelsWrapper.innerHTML = labels.join('');

  heading.innerHTML = title;
  chart.innerHTML = pieces.reverse().join('');
  wrapper.appendChild(heading);
  wrapper.appendChild(chart);
  wrapper.appendChild(labelsWrapper);

  return wrapper;
}

function makePieProperties(parts){
  var total = _(parts).values().sum();

  var partsCalculated = [];

  var partsFor = _.keys(parts).sort();

  var partsEls = _.map(partsFor, function(partFor, index){
    var previous = partsCalculated[index - 1] || 0;
    var count = parts[partFor];
    partsCalculated[index] = previous + count;
    var resultingDash = (partsCalculated[index]/total) * Math.PI/2 * 100 + ' ' + Math.PI/2 * 100;
    return {count: count, dash: resultingDash, partFor: partFor.toLowerCase()};
  });

  return partsEls;
}

function hideDetails(){
  detailsElement.elt.parentNode.classList.remove('active');
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
  updateDetails(currentTimeInt);
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

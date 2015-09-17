var _ = require('underscore'),
  fs = require('fs');
var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();

var Firebase = require("firebase");

// BOOMOIO Settings
var maxPlayers = 6;
var startHand = 7;
var startTime = 60;
var startLives = 5;

// Doodoodle Settings
// var prepTime = 2 * 1000;
var drawTime = 120 * 1000;
var voteTime = 10 * 1000;

var STATE = {
  PREP :    { value: 0, name: "prep",   title: "Preparation"},
  DRAW:     { value: 1, name: "draw",   title: "Draw Phase" },
  VOTE :    { value: 2, name: "vote",   title: "Vote Phase" },
  RESULT:   { value: 3, name: "result", title: "Results"    }
};

var seeds = [
    [[{"x":"107.33","y":"329.03"},{"x":"107.33","y":"326.45"},{"x":"107.33","y":"313.55"},{"x":"107.33","y":"296.77"},{"x":"107.33","y":"281.29"},{"x":"108.62","y":"261.94"},{"x":"111.21","y":"236.13"},{"x":"113.79","y":"212.90"},{"x":"117.67","y":"187.10"},{"x":"125.43","y":"161.29"},{"x":"129.31","y":"149.68"},{"x":"134.48","y":"135.48"},{"x":"137.07","y":"126.45"},{"x":"138.36","y":"123.87"},{"x":"138.36","y":"123.87"},{"x":"139.66","y":"123.87"},{"x":"140.95","y":"123.87"},{"x":"140.95","y":"123.87"},{"x":"140.95","y":"123.87"},{"x":"143.53","y":"125.16"},{"x":"144.83","y":"127.74"},{"x":"146.12","y":"131.61"},{"x":"152.59","y":"139.35"},{"x":"160.34","y":"148.39"},{"x":"171.98","y":"160.00"},{"x":"186.21","y":"176.77"},{"x":"199.14","y":"189.68"},{"x":"210.78","y":"202.58"},{"x":"222.41","y":"212.90"},{"x":"235.34","y":"227.10"},{"x":"244.40","y":"241.29"},{"x":"256.03","y":"264.52"},{"x":"261.21","y":"283.87"},{"x":"263.79","y":"301.94"},{"x":"266.38","y":"312.26"},{"x":"266.38","y":"320.00"},{"x":"267.67","y":"323.87"},{"x":"267.67","y":"326.45"},{"x":"267.67","y":"327.74"},{"x":"267.67","y":"329.03"},{"x":"267.67","y":"330.32"}]],
    [[{"x":"241.81","y":"234.84"},{"x":"240.52","y":"234.84"},{"x":"237.93","y":"234.84"},{"x":"232.76","y":"234.84"},{"x":"227.59","y":"234.84"},{"x":"217.24","y":"234.84"},{"x":"206.90","y":"234.84"},{"x":"196.55","y":"234.84"},{"x":"181.03","y":"234.84"},{"x":"170.69","y":"234.84"},{"x":"161.64","y":"234.84"},{"x":"153.88","y":"234.84"},{"x":"148.71","y":"234.84"},{"x":"144.83","y":"234.84"},{"x":"139.66","y":"234.84"},{"x":"135.78","y":"234.84"},{"x":"133.19","y":"236.13"},{"x":"130.60","y":"236.13"},{"x":"129.31","y":"236.13"},{"x":"128.02","y":"236.13"},{"x":"128.02","y":"237.42"},{"x":"126.72","y":"237.42"},{"x":"125.43","y":"237.42"},{"x":"124.14","y":"237.42"},{"x":"124.14","y":"237.42"},{"x":"122.84","y":"237.42"},{"x":"121.55","y":"237.42"},{"x":"121.55","y":"237.42"},{"x":"118.97","y":"237.42"},{"x":"117.67","y":"237.42"},{"x":"116.38","y":"237.42"},{"x":"115.09","y":"237.42"},{"x":"115.09","y":"237.42"}]],
    [[{"x":"236.44","y":"228.43"},{"x":"236.44","y":"229.95"},{"x":"236.44","y":"232.99"},{"x":"231.86","y":"236.04"},{"x":"227.29","y":"243.65"},{"x":"221.19","y":"251.27"},{"x":"215.08","y":"258.88"},{"x":"205.93","y":"266.50"},{"x":"198.31","y":"275.63"},{"x":"190.68","y":"283.25"},{"x":"187.63","y":"287.82"},{"x":"187.63","y":"292.39"},{"x":"187.63","y":"298.48"},{"x":"187.63","y":"301.52"},{"x":"201.36","y":"306.09"},{"x":"225.76","y":"307.61"},{"x":"247.12","y":"307.61"},{"x":"276.10","y":"307.61"},{"x":"291.36","y":"306.09"},{"x":"302.03","y":"303.05"},{"x":"305.08","y":"301.52"},{"x":"306.61","y":"301.52"},{"x":"308.14","y":"300.00"},{"x":"305.08","y":"300.00"},{"x":"291.36","y":"301.52"},{"x":"274.58","y":"309.14"},{"x":"254.75","y":"322.84"},{"x":"239.49","y":"335.03"},{"x":"231.86","y":"344.16"},{"x":"227.29","y":"357.87"},{"x":"225.76","y":"367.01"},{"x":"225.76","y":"377.66"},{"x":"225.76","y":"388.32"},{"x":"225.76","y":"398.98"},{"x":"225.76","y":"406.60"},{"x":"227.29","y":"415.74"},{"x":"228.81","y":"421.83"},{"x":"228.81","y":"426.40"},{"x":"228.81","y":"430.96"},{"x":"228.81","y":"432.49"},{"x":"225.76","y":"432.49"},{"x":"213.56","y":"432.49"},{"x":"195.25","y":"426.40"},{"x":"175.42","y":"415.74"},{"x":"152.54","y":"405.08"},{"x":"132.71","y":"394.42"},{"x":"123.56","y":"382.23"},{"x":"115.93","y":"362.44"},{"x":"114.41","y":"338.07"},{"x":"114.41","y":"321.32"},{"x":"120.51","y":"306.09"},{"x":"126.61","y":"292.39"},{"x":"132.71","y":"284.77"},{"x":"140.34","y":"274.11"},{"x":"144.92","y":"269.54"},{"x":"147.97","y":"264.97"},{"x":"151.02","y":"261.93"},{"x":"152.54","y":"260.41"}]],
    [[{"x":"112.50","y":"377.50"},{"x":"112.50","y":"376.25"},{"x":"112.50","y":"372.50"},{"x":"112.50","y":"367.50"},{"x":"112.50","y":"357.50"},{"x":"112.50","y":"343.75"},{"x":"112.50","y":"330.00"},{"x":"116.25","y":"302.50"},{"x":"120.00","y":"288.75"},{"x":"123.75","y":"272.50"},{"x":"127.50","y":"258.75"},{"x":"131.25","y":"243.75"},{"x":"137.50","y":"228.75"},{"x":"142.50","y":"217.50"},{"x":"148.75","y":"205.00"},{"x":"153.75","y":"196.25"},{"x":"160.00","y":"185.00"},{"x":"166.25","y":"171.25"},{"x":"173.75","y":"157.50"},{"x":"178.75","y":"146.25"},{"x":"186.25","y":"132.50"},{"x":"195.00","y":"115.00"},{"x":"198.75","y":"102.50"},{"x":"202.50","y":"93.75"},{"x":"205.00","y":"86.25"},{"x":"206.25","y":"82.50"},{"x":"207.50","y":"78.75"},{"x":"210.00","y":"77.50"},{"x":"210.00","y":"76.25"},{"x":"211.25","y":"76.25"},{"x":"212.50","y":"76.25"},{"x":"212.50","y":"77.50"},{"x":"213.75","y":"77.50"},{"x":"213.75","y":"78.75"},{"x":"213.75","y":"80.00"},{"x":"213.75","y":"80.00"},{"x":"215.00","y":"80.00"},{"x":"215.00","y":"81.25"},{"x":"215.00","y":"85.00"},{"x":"216.25","y":"87.50"},{"x":"218.75","y":"92.50"},{"x":"221.25","y":"96.25"},{"x":"225.00","y":"105.00"},{"x":"227.50","y":"112.50"},{"x":"231.25","y":"122.50"},{"x":"235.00","y":"131.25"},{"x":"238.75","y":"142.50"},{"x":"242.50","y":"157.50"},{"x":"247.50","y":"175.00"},{"x":"252.50","y":"192.50"},{"x":"255.00","y":"208.75"},{"x":"258.75","y":"226.25"},{"x":"261.25","y":"243.75"},{"x":"262.50","y":"253.75"},{"x":"265.00","y":"271.25"},{"x":"265.00","y":"277.50"},{"x":"265.00","y":"285.00"},{"x":"265.00","y":"291.25"},{"x":"265.00","y":"297.50"},{"x":"265.00","y":"301.25"},{"x":"266.25","y":"306.25"},{"x":"266.25","y":"312.50"},{"x":"266.25","y":"320.00"},{"x":"266.25","y":"322.50"},{"x":"266.25","y":"323.75"},{"x":"266.25","y":"325.00"},{"x":"266.25","y":"326.25"},{"x":"266.25","y":"327.50"},{"x":"266.25","y":"330.00"},{"x":"266.25","y":"331.25"},{"x":"267.50","y":"335.00"},{"x":"267.50","y":"340.00"},{"x":"268.75","y":"342.50"},{"x":"270.00","y":"348.75"},{"x":"270.00","y":"350.00"},{"x":"270.00","y":"351.25"},{"x":"270.00","y":"351.25"},{"x":"270.00","y":"352.50"},{"x":"270.00","y":"353.75"},{"x":"270.00","y":"355.00"},{"x":"270.00","y":"356.25"},{"x":"270.00","y":"356.25"},{"x":"270.00","y":"357.50"},{"x":"270.00","y":"358.75"},{"x":"270.00","y":"360.00"},{"x":"270.00","y":"361.25"},{"x":"270.00","y":"362.50"},{"x":"270.00","y":"363.75"},{"x":"270.00","y":"365.00"},{"x":"270.00","y":"366.25"},{"x":"270.00","y":"368.75"},{"x":"270.00","y":"372.50"},{"x":"270.00","y":"376.25"},{"x":"270.00","y":"377.50"},{"x":"270.00","y":"378.75"}],[{"x":"143.75","y":"226.25"},{"x":"146.25","y":"226.25"},{"x":"150.00","y":"226.25"},{"x":"155.00","y":"226.25"},{"x":"158.75","y":"226.25"},{"x":"162.50","y":"226.25"},{"x":"165.00","y":"226.25"},{"x":"166.25","y":"226.25"},{"x":"168.75","y":"226.25"},{"x":"171.25","y":"226.25"},{"x":"172.50","y":"226.25"},{"x":"175.00","y":"226.25"},{"x":"177.50","y":"226.25"},{"x":"180.00","y":"226.25"},{"x":"183.75","y":"226.25"},{"x":"187.50","y":"226.25"},{"x":"190.00","y":"226.25"},{"x":"192.50","y":"226.25"},{"x":"196.25","y":"226.25"},{"x":"198.75","y":"226.25"},{"x":"201.25","y":"226.25"},{"x":"203.75","y":"226.25"},{"x":"206.25","y":"226.25"},{"x":"210.00","y":"226.25"},{"x":"211.25","y":"226.25"},{"x":"212.50","y":"226.25"},{"x":"213.75","y":"226.25"},{"x":"216.25","y":"226.25"},{"x":"217.50","y":"226.25"},{"x":"220.00","y":"226.25"},{"x":"222.50","y":"226.25"},{"x":"225.00","y":"226.25"},{"x":"226.25","y":"226.25"},{"x":"227.50","y":"226.25"},{"x":"228.75","y":"227.50"},{"x":"230.00","y":"227.50"},{"x":"231.25","y":"227.50"},{"x":"232.50","y":"227.50"},{"x":"233.75","y":"227.50"},{"x":"236.25","y":"228.75"},{"x":"237.50","y":"228.75"},{"x":"237.50","y":"228.75"},{"x":"238.75","y":"228.75"},{"x":"240.00","y":"228.75"},{"x":"241.25","y":"228.75"},{"x":"242.50","y":"228.75"},{"x":"242.50","y":"228.75"},{"x":"243.75","y":"228.75"},{"x":"245.00","y":"228.75"},{"x":"246.25","y":"228.75"},{"x":"247.50","y":"228.75"},{"x":"247.50","y":"228.75"},{"x":"248.75","y":"228.75"},{"x":"248.75","y":"230.00"},{"x":"250.00","y":"230.00"},{"x":"251.25","y":"230.00"},{"x":"252.50","y":"230.00"},{"x":"252.50","y":"230.00"},{"x":"253.75","y":"230.00"},{"x":"255.00","y":"230.00"}]],
    [[{"x":"286.25","y":"208.75"},{"x":"285.00","y":"208.75"},{"x":"281.25","y":"206.25"},{"x":"278.75","y":"205.00"},{"x":"275.00","y":"205.00"},{"x":"272.50","y":"202.50"},{"x":"271.25","y":"202.50"},{"x":"270.00","y":"201.25"},{"x":"267.50","y":"200.00"},{"x":"266.25","y":"198.75"},{"x":"265.00","y":"198.75"},{"x":"263.75","y":"198.75"},{"x":"262.50","y":"197.50"},{"x":"261.25","y":"197.50"},{"x":"261.25","y":"196.25"},{"x":"260.00","y":"196.25"},{"x":"260.00","y":"195.00"},{"x":"258.75","y":"195.00"},{"x":"257.50","y":"193.75"},{"x":"253.75","y":"192.50"},{"x":"250.00","y":"190.00"},{"x":"245.00","y":"190.00"},{"x":"241.25","y":"188.75"},{"x":"236.25","y":"187.50"},{"x":"233.75","y":"187.50"},{"x":"230.00","y":"186.25"},{"x":"225.00","y":"186.25"},{"x":"222.50","y":"186.25"},{"x":"218.75","y":"186.25"},{"x":"215.00","y":"186.25"},{"x":"212.50","y":"186.25"},{"x":"210.00","y":"186.25"},{"x":"207.50","y":"186.25"},{"x":"206.25","y":"186.25"},{"x":"205.00","y":"186.25"},{"x":"202.50","y":"186.25"},{"x":"198.75","y":"186.25"},{"x":"195.00","y":"187.50"},{"x":"193.75","y":"187.50"},{"x":"190.00","y":"187.50"},{"x":"187.50","y":"187.50"},{"x":"183.75","y":"190.00"},{"x":"180.00","y":"191.25"},{"x":"177.50","y":"192.50"},{"x":"173.75","y":"193.75"},{"x":"170.00","y":"196.25"},{"x":"167.50","y":"197.50"},{"x":"163.75","y":"198.75"},{"x":"160.00","y":"200.00"},{"x":"158.75","y":"202.50"},{"x":"156.25","y":"203.75"},{"x":"153.75","y":"205.00"},{"x":"152.50","y":"206.25"},{"x":"150.00","y":"208.75"},{"x":"147.50","y":"210.00"},{"x":"146.25","y":"211.25"},{"x":"142.50","y":"213.75"},{"x":"142.50","y":"215.00"},{"x":"141.25","y":"215.00"},{"x":"140.00","y":"216.25"},{"x":"138.75","y":"216.25"},{"x":"137.50","y":"217.50"},{"x":"136.25","y":"221.25"},{"x":"135.00","y":"222.50"},{"x":"132.50","y":"225.00"},{"x":"131.25","y":"227.50"},{"x":"130.00","y":"230.00"},{"x":"128.75","y":"232.50"},{"x":"127.50","y":"237.50"},{"x":"125.00","y":"241.25"},{"x":"122.50","y":"248.75"},{"x":"121.25","y":"253.75"},{"x":"120.00","y":"258.75"},{"x":"117.50","y":"262.50"},{"x":"116.25","y":"267.50"},{"x":"115.00","y":"271.25"},{"x":"115.00","y":"275.00"},{"x":"113.75","y":"278.75"},{"x":"113.75","y":"282.50"},{"x":"113.75","y":"285.00"},{"x":"113.75","y":"290.00"},{"x":"113.75","y":"293.75"},{"x":"113.75","y":"298.75"},{"x":"113.75","y":"303.75"},{"x":"113.75","y":"308.75"},{"x":"113.75","y":"313.75"},{"x":"115.00","y":"316.25"},{"x":"116.25","y":"321.25"},{"x":"118.75","y":"325.00"},{"x":"120.00","y":"328.75"},{"x":"121.25","y":"333.75"},{"x":"123.75","y":"337.50"},{"x":"125.00","y":"338.75"},{"x":"126.25","y":"342.50"},{"x":"128.75","y":"345.00"},{"x":"131.25","y":"346.25"},{"x":"133.75","y":"348.75"},{"x":"136.25","y":"352.50"},{"x":"138.75","y":"355.00"},{"x":"140.00","y":"355.00"},{"x":"145.00","y":"356.25"},{"x":"147.50","y":"357.50"},{"x":"151.25","y":"361.25"},{"x":"155.00","y":"362.50"},{"x":"160.00","y":"366.25"},{"x":"162.50","y":"366.25"},{"x":"163.75","y":"367.50"},{"x":"166.25","y":"367.50"},{"x":"170.00","y":"370.00"},{"x":"175.00","y":"370.00"},{"x":"178.75","y":"370.00"},{"x":"182.50","y":"370.00"},{"x":"186.25","y":"370.00"},{"x":"187.50","y":"370.00"},{"x":"191.25","y":"370.00"},{"x":"193.75","y":"370.00"},{"x":"196.25","y":"370.00"},{"x":"198.75","y":"370.00"},{"x":"201.25","y":"370.00"},{"x":"203.75","y":"367.50"},{"x":"207.50","y":"366.25"},{"x":"211.25","y":"365.00"},{"x":"213.75","y":"363.75"},{"x":"220.00","y":"362.50"},{"x":"223.75","y":"361.25"},{"x":"226.25","y":"360.00"},{"x":"230.00","y":"358.75"},{"x":"235.00","y":"356.25"},{"x":"238.75","y":"355.00"},{"x":"243.75","y":"352.50"},{"x":"247.50","y":"351.25"},{"x":"251.25","y":"348.75"},{"x":"256.25","y":"347.50"},{"x":"258.75","y":"345.00"},{"x":"261.25","y":"342.50"},{"x":"263.75","y":"337.50"},{"x":"266.25","y":"335.00"},{"x":"268.75","y":"332.50"},{"x":"271.25","y":"330.00"},{"x":"273.75","y":"328.75"},{"x":"276.25","y":"325.00"},{"x":"277.50","y":"321.25"},{"x":"280.00","y":"318.75"},{"x":"281.25","y":"315.00"},{"x":"281.25","y":"312.50"},{"x":"281.25","y":"308.75"},{"x":"281.25","y":"305.00"},{"x":"281.25","y":"302.50"},{"x":"281.25","y":"301.25"},{"x":"281.25","y":"298.75"},{"x":"277.50","y":"292.50"},{"x":"273.75","y":"288.75"},{"x":"270.00","y":"286.25"},{"x":"267.50","y":"282.50"},{"x":"263.75","y":"280.00"},{"x":"261.25","y":"277.50"},{"x":"257.50","y":"273.75"},{"x":"255.00","y":"270.00"},{"x":"252.50","y":"267.50"},{"x":"250.00","y":"265.00"},{"x":"248.75","y":"262.50"},{"x":"246.25","y":"261.25"},{"x":"245.00","y":"258.75"},{"x":"242.50","y":"256.25"},{"x":"240.00","y":"253.75"},{"x":"236.25","y":"252.50"},{"x":"235.00","y":"250.00"},{"x":"193.75","y":"237.50"},{"x":"192.50","y":"237.50"},{"x":"191.25","y":"237.50"},{"x":"190.00","y":"237.50"},{"x":"188.75","y":"237.50"},{"x":"186.25","y":"237.50"},{"x":"183.75","y":"238.75"},{"x":"182.50","y":"240.00"},{"x":"178.75","y":"241.25"},{"x":"177.50","y":"242.50"},{"x":"173.75","y":"245.00"},{"x":"171.25","y":"246.25"},{"x":"170.00","y":"247.50"},{"x":"167.50","y":"248.75"},{"x":"165.00","y":"250.00"},{"x":"163.75","y":"252.50"},{"x":"160.00","y":"255.00"},{"x":"160.00","y":"257.50"},{"x":"158.75","y":"260.00"},{"x":"157.50","y":"262.50"},{"x":"156.25","y":"263.75"},{"x":"156.25","y":"265.00"},{"x":"156.25","y":"266.25"},{"x":"156.25","y":"267.50"},{"x":"156.25","y":"268.75"},{"x":"156.25","y":"270.00"},{"x":"156.25","y":"272.50"},{"x":"157.50","y":"275.00"},{"x":"157.50","y":"278.75"},{"x":"157.50","y":"282.50"},{"x":"158.75","y":"286.25"},{"x":"158.75","y":"288.75"},{"x":"158.75","y":"291.25"},{"x":"158.75","y":"293.75"},{"x":"160.00","y":"296.25"},{"x":"160.00","y":"297.50"},{"x":"161.25","y":"300.00"},{"x":"162.50","y":"302.50"},{"x":"162.50","y":"303.75"},{"x":"163.75","y":"306.25"},{"x":"165.00","y":"307.50"},{"x":"165.00","y":"310.00"},{"x":"166.25","y":"311.25"},{"x":"167.50","y":"312.50"},{"x":"168.75","y":"312.50"},{"x":"171.25","y":"313.75"},{"x":"173.75","y":"315.00"},{"x":"176.25","y":"315.00"},{"x":"178.75","y":"315.00"},{"x":"182.50","y":"315.00"},{"x":"185.00","y":"315.00"},{"x":"187.50","y":"315.00"},{"x":"188.75","y":"315.00"},{"x":"192.50","y":"315.00"},{"x":"195.00","y":"315.00"},{"x":"197.50","y":"315.00"},{"x":"200.00","y":"315.00"},{"x":"203.75","y":"315.00"},{"x":"205.00","y":"315.00"},{"x":"206.25","y":"315.00"},{"x":"207.50","y":"313.75"},{"x":"208.75","y":"313.75"},{"x":"208.75","y":"312.50"},{"x":"208.75","y":"311.25"},{"x":"208.75","y":"311.25"},{"x":"208.75","y":"310.00"},{"x":"208.75","y":"308.75"},{"x":"208.75","y":"308.75"},{"x":"208.75","y":"307.50"},{"x":"208.75","y":"308.75"}]],
    [[{"x":"242.50","y":"80.00"},{"x":"241.25","y":"81.25"},{"x":"240.00","y":"82.50"},{"x":"238.75","y":"85.00"},{"x":"236.25","y":"87.50"},{"x":"235.00","y":"91.25"},{"x":"232.50","y":"96.25"},{"x":"230.00","y":"101.25"},{"x":"226.25","y":"111.25"},{"x":"222.50","y":"120.00"},{"x":"218.75","y":"131.25"},{"x":"215.00","y":"140.00"},{"x":"212.50","y":"147.50"},{"x":"210.00","y":"158.75"},{"x":"205.00","y":"168.75"},{"x":"202.50","y":"176.25"},{"x":"198.75","y":"183.75"},{"x":"197.50","y":"187.50"},{"x":"197.50","y":"190.00"},{"x":"197.50","y":"190.00"},{"x":"196.25","y":"192.50"},{"x":"196.25","y":"196.25"},{"x":"193.75","y":"200.00"},{"x":"192.50","y":"203.75"},{"x":"190.00","y":"207.50"},{"x":"188.75","y":"210.00"},{"x":"187.50","y":"211.25"},{"x":"185.00","y":"213.75"},{"x":"182.50","y":"216.25"},{"x":"181.25","y":"220.00"},{"x":"180.00","y":"222.50"},{"x":"178.75","y":"225.00"},{"x":"177.50","y":"230.00"},{"x":"176.25","y":"235.00"},{"x":"175.00","y":"240.00"},{"x":"173.75","y":"245.00"},{"x":"173.75","y":"246.25"},{"x":"173.75","y":"250.00"},{"x":"173.75","y":"251.25"},{"x":"173.75","y":"253.75"},{"x":"171.25","y":"257.50"},{"x":"171.25","y":"261.25"},{"x":"171.25","y":"266.25"},{"x":"170.00","y":"270.00"},{"x":"168.75","y":"275.00"},{"x":"168.75","y":"278.75"},{"x":"167.50","y":"282.50"},{"x":"167.50","y":"287.50"},{"x":"167.50","y":"287.50"},{"x":"167.50","y":"288.75"},{"x":"167.50","y":"290.00"},{"x":"167.50","y":"288.75"},{"x":"168.75","y":"286.25"},{"x":"170.00","y":"285.00"},{"x":"171.25","y":"282.50"},{"x":"173.75","y":"281.25"},{"x":"176.25","y":"280.00"},{"x":"180.00","y":"276.25"},{"x":"187.50","y":"273.75"},{"x":"191.25","y":"270.00"},{"x":"195.00","y":"267.50"},{"x":"198.75","y":"262.50"},{"x":"201.25","y":"260.00"},{"x":"206.25","y":"257.50"},{"x":"208.75","y":"253.75"},{"x":"212.50","y":"251.25"},{"x":"216.25","y":"248.75"},{"x":"221.25","y":"245.00"},{"x":"225.00","y":"242.50"},{"x":"228.75","y":"240.00"},{"x":"232.50","y":"238.75"},{"x":"236.25","y":"237.50"},{"x":"237.50","y":"235.00"},{"x":"241.25","y":"233.75"},{"x":"243.75","y":"232.50"},{"x":"245.00","y":"231.25"},{"x":"246.25","y":"231.25"},{"x":"247.50","y":"231.25"},{"x":"248.75","y":"230.00"},{"x":"251.25","y":"230.00"},{"x":"252.50","y":"228.75"},{"x":"253.75","y":"228.75"},{"x":"255.00","y":"228.75"},{"x":"256.25","y":"228.75"},{"x":"257.50","y":"228.75"},{"x":"258.75","y":"228.75"},{"x":"260.00","y":"228.75"},{"x":"260.00","y":"228.75"},{"x":"261.25","y":"228.75"},{"x":"262.50","y":"228.75"},{"x":"263.75","y":"228.75"},{"x":"262.50","y":"228.75"},{"x":"261.25","y":"228.75"},{"x":"260.00","y":"228.75"},{"x":"258.75","y":"228.75"},{"x":"258.75","y":"230.00"},{"x":"258.75","y":"230.00"},{"x":"258.75","y":"231.25"},{"x":"257.50","y":"231.25"},{"x":"255.00","y":"236.25"},{"x":"252.50","y":"243.75"},{"x":"250.00","y":"250.00"},{"x":"247.50","y":"256.25"},{"x":"245.00","y":"262.50"},{"x":"243.75","y":"270.00"},{"x":"241.25","y":"280.00"},{"x":"238.75","y":"291.25"},{"x":"235.00","y":"305.00"},{"x":"232.50","y":"318.75"},{"x":"231.25","y":"328.75"},{"x":"228.75","y":"333.75"},{"x":"227.50","y":"336.25"},{"x":"226.25","y":"340.00"},{"x":"223.75","y":"343.75"},{"x":"220.00","y":"348.75"},{"x":"215.00","y":"353.75"},{"x":"212.50","y":"358.75"},{"x":"211.25","y":"362.50"},{"x":"207.50","y":"366.25"},{"x":"205.00","y":"371.25"},{"x":"203.75","y":"378.75"},{"x":"201.25","y":"383.75"},{"x":"201.25","y":"391.25"},{"x":"201.25","y":"397.50"},{"x":"201.25","y":"401.25"},{"x":"201.25","y":"405.00"},{"x":"201.25","y":"406.25"},{"x":"201.25","y":"407.50"},{"x":"200.00","y":"410.00"},{"x":"198.75","y":"413.75"},{"x":"197.50","y":"417.50"},{"x":"196.25","y":"421.25"},{"x":"193.75","y":"426.25"},{"x":"193.75","y":"428.75"},{"x":"192.50","y":"431.25"},{"x":"192.50","y":"432.50"},{"x":"192.50","y":"433.75"},{"x":"192.50","y":"433.75"},{"x":"192.50","y":"432.50"},{"x":"191.25","y":"432.50"}]]
];

var newRoom = function () {
    var roomString = "";
    var validCharacters = "BCDFGHJKLMNPQRSTVWXYZ";
    // Get four random
    while (roomString.length < 4) {
        roomString += validCharacters.substr(Math.floor(Math.random()*validCharacters.length), 1);
    }
    
    // // DEBUG
    // roomString = "TEST";
    // // DEBUG: Remove any existing tests
    // var game = getGame(roomString);
    // games = _.without(games, game);
    
    return roomString;
};

var init = function (cb) {
    fs.readFile('names.txt', function (err, data) {
        if (err) throw err;
        names = data.toString().split("\n");
    });
};

var newGame = function (host, cb) {
    var game = {
        timer:startTime,
        players:[],
        turn:null,
        state:STATE.PREP,
        round:0,
        theme:pickTheme(),
        votingRound:-1,
        room:newRoom(),
        host:host,
        begin:null,
        end:null,
        now:null
    };
    return game;
};

var getGame = function (room, cb) {
    console.log("Getting Game", room);
    var gameRef = new Firebase("https://doodoodle.firebaseio.com/games/" + room);
    gameRef.once('value', function(game){
        cb(game.val());
    });
};

var postGame = function (game) {
    var gameRef = new Firebase("https://doodoodle.firebaseio.com/games/" + game.room);
    gameRef.set(game);
};


var newRound = function (game, cb) {
    var drawings = []; // An array of Drawing objects
    // Give every active player two starting doodles

    var activePlayers = _.where(game.players, {state: "active"});
    activePlayers = _.shuffle(activePlayers); // Randomize pairings
    _.each(game.players, function(element, index, list) {element.waiting = false;});

    // For every active person in the players
    var votingRound = 0;
    newDrawingSeeds(activePlayers.length, function(roundSeeds){
      for(var p in activePlayers){
          var player = activePlayers[p];
          
          var drawing = {
              playerId: player.id,
              seed: roundSeeds[p],
              position: 1,
              votingRound: votingRound,
              lines: null,
              votes: [player.id],
              submitted: false
          };
          drawings.push(drawing);

          partnerId = activePlayers[(p+1) % activePlayers.length ].id;
          var drawing2 = {
              playerId: partnerId,
              seed: roundSeeds[p],
              position: 2,
              votingRound: votingRound,
              lines: null,
              votes: [partnerId],
              submitted: false
          };
          drawings.push(drawing2);

          votingRound++;
      }

      game.drawings = drawings;
      cb(game);
    });
    
};

var newDrawingSeeds = function(count, cb) {
    var seedRef = new Firebase("https://doodoodle.firebaseio.com/seeds_list");
    seedRef.once("value", function(data){
      seeds = data.val();
      cb(_.sample(seeds, count));
    });

    // var debugSeed = [[{"x":"159.81","y":"124.37"},{"x":"159.81","y":"125.21"},{"x":"159.81","y":"183.19"},{"x":"159.81","y":"195.80"},{"x":"159.81","y":"209.24"},{"x":"159.81","y":"222.69"},{"x":"159.81","y":"242.02"},{"x":"159.81","y":"249.58"},{"x":"159.81","y":"262.18"},{"x":"159.81","y":"268.91"},{"x":"159.81","y":"273.11"},{"x":"159.81","y":"273.95"},{"x":"159.81","y":"276.47"},{"x":"159.81","y":"277.31"},{"x":"159.81","y":"278.99"},{"x":"159.81","y":"279.83"},{"x":"159.81","y":"280.67"},{"x":"160.65","y":"280.67"},{"x":"161.50","y":"280.67"},{"x":"161.50","y":"280.67"},{"x":"162.34","y":"280.67"},{"x":"163.18","y":"280.67"},{"x":"164.02","y":"280.67"},{"x":"164.02","y":"279.83"},{"x":"167.38","y":"279.83"},{"x":"171.59","y":"278.99"},{"x":"177.48","y":"278.99"},{"x":"183.36","y":"278.99"},{"x":"188.41","y":"278.99"},{"x":"190.93","y":"278.99"},{"x":"194.30","y":"278.99"},{"x":"198.50","y":"278.99"},{"x":"202.71","y":"278.99"},{"x":"206.07","y":"279.83"},{"x":"208.60","y":"282.35"},{"x":"211.12","y":"283.19"},{"x":"211.96","y":"283.19"},{"x":"211.96","y":"284.03"},{"x":"212.80","y":"284.03"},{"x":"212.80","y":"284.03"}]]
    // return debugSeed;
    
};

var pickTheme = function(){
    return _.sample(["sports", "animals", "travel", "people", "music", "events"]);
};

var updateScores = function(game){
    for(var x in game.drawings){
        var drawing = game.drawings[x];
        var player = _.find(game.players, {"id":drawing.playerId});
        player.score += drawing.votes.length-1;
    }
};

var setPlayerToGame = function(playerId, gameRoom, cb){
    var playerRef = new Firebase("https://doodoodle.firebaseio.com/players/" + playerId);
    playerRef.set(gameRoom, cb);
};

exports.playerToGame = function(playerId, cb){
    var playerRef = new Firebase("https://doodoodle.firebaseio.com/players/" + playerId);
    playerRef.once("value", function(data){
        console.log("Player:", playerId, "Game:", data.val());
        cb(data.val());
    });
    // return playerToGame[playerId];
};

var pushSeed = function(seed, cb){
  var seedRef = new Firebase("https://doodoodle.firebaseio.com/seeds_list");
  seedRef.push(seed);
}

exports.host = function(uuid, cb){
    // Create a game, but do not add the player to it
    if(uuid === undefined) {
        cb("UUID not found");
        return;
    }

    game = newGame(uuid);
    // var game = _.find(games, function(game){ return game.host == uuid });
    // if(typeof game == "undefined") {
    //     game = newGame(uuid);
    // }
    postGame(game); // Export to Firebase
    cb(null, game);
}

exports.join = function(uuid, name, room, cb){
    if(uuid === undefined) {
        cb("UUID not found");
        return;
    }
    room = room.toUpperCase()
    getGame(room, function(game){
        console.log("Join room ", game)
        if(typeof game == "undefined") {
            cb("Room " + room + " not found")
            // console.log("Room " + room + " not found, creating")
            // game = newGame(room);
            return;
        }
        // game.now = new Date().getTime()
        var player = _.findWhere( game.players, {id: uuid} )
        if( typeof player === 'undefined'){
            var player = {
                id: uuid
                , name: name
                , state: 'active'
                , position:-1
                , score: 0
                , room: room
                , waiting: false
            }
            // Take a hand of cards from the deck
            setPlayerToGame(player.id, game.room);
        }
        // if(_.where(game.players, {state:'active'}).length >= maxPlayers) player.state = 'spectating';

        // players.push(player); // All players
        if(!game.players) game.players = [];
        game.players.push(player); // Players for the game
        
        // DEBUG
        if(game.room == "DRAW"){
          // Set the timer
          var now = new Date().getTime(); // Milliseconds
          game.begin = now;
          game.end = now + drawTime;
          game.now = now;
        }
        postGame(game); // Export to Firebase
        cb(null, game);
    });
    
};

exports.start = function(room, cb){
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        var activePlayers = _.pluck(_.where(game.players, {state: "active"}), 'id');
        if(activePlayers.length < 3) return cb("Not enough players to start", null);
        if(game.state.name != STATE.PREP.name && game.state.name != STATE.RESULT.name) return cb("Now is not the time to start a new round");

        game.state = STATE.DRAW;
        if( game.round >= 3 ){
            _.each(game.players, function(player){
                player.score = 0;
            });
            game.round = 0;
        }
        game.round++;
        newRound(game, function(game){
          var now = new Date().getTime(); // Milliseconds
          game.begin = now;
          game.end = now + drawTime;
          game.now = now;
          
          postGame(game); // Export to Firebase
          cb(null, game);
        });
    });
};

exports.saveDrawing = function(uuid, room, data, cb){
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        var player = _.findWhere( game.players, {id: uuid} );
        if(!player) return cb("player not found", null);
        var drawing = _.findWhere( game.drawings, {playerId: player.id, votingRound: data.votingRound, position: data.position});
        if(!drawing) { return cb("You are not a part of this round", null); }
        drawing.lines = data.lines;
        drawing.submitted = true;

        // Determine whether to set the player's waiting variable
        // _.find(game.drawings, function(drawing){
        //     return !('lines' in drawing); // 
        // });

        if (_.findWhere( game.drawings, {submitted: false, playerId:player.id} ) === undefined) {
            player.waiting = true;
        }

        if (_.findWhere( game.players, {waiting: false, state:'active'} ) === undefined) {
            _.each(game.players, function(element, index, list) {element.waiting = false;});
            game.state = STATE.VOTE;
            game.votingRound = 0;
            // Set the timer
            var now = new Date().getTime(); // Milliseconds
            game.begin = now;
            game.end = now + voteTime;
            game.now = now;
            
        }
        // EXTRA Put a line from the drawing into the seeds
        if(drawing.lines) {
            var seedLine = _.sample(drawing.lines);
            pushSeed([seedLine.points]);
        }
        postGame(game); // Export to Firebase
        cb(null, game);
    });
    

};

exports.vote = function(uuid, room, votingRound, position, cb){
    getGame(room, function(game){
        if(!game) return cb("game not found", null);
        if(game.votingRound != votingRound) return cb("Too late, wrong round");
        var player = _.findWhere( game.players, {id: uuid} );
        if(!player) return cb("player not found", null);
        var drawingsThisRound = _.where(game.drawings, {votingRound:votingRound});
        var allVotes = _.flatten(_.pluck(drawingsThisRound, 'votes'));
        var hasVoted = _.contains(allVotes, uuid);
        // _.find(drawingsThisRound, function(drawing){
        //     return _.contains(drawing.votes, uuid);
        // });
        if(hasVoted) return cb("You've already voted this round");
        var drawing = _.findWhere(game.drawings, {votingRound:votingRound, position:position});
        
        // TODO: Check the other drawings for votes this round
        if(drawing.votes === null) drawing.votes = [drawing.playerId];
        drawing.votes.push(uuid);
        player.waiting = true;
        // Check here to move to the next voting round/Result phase
        var activePlayers = _.pluck(_.where(game.players, {state: "active"}), 'id');

        // If there are no active players not in the allVotes list, continue
        var votersLeft = _.difference(activePlayers, allVotes, [uuid]);
        
        if(votersLeft.length === 0) {
            _.each(game.players, function(element, index, list) {element.waiting = false;});
            game.votingRound += 1;
            // TODO: Reset the start/end times
            var now = new Date().getTime(); // Milliseconds
            game.begin = now;
            game.end = now + voteTime;
            game.now = now;
            
        }
        if(game.votingRound >= activePlayers.length){
            updateScores(game);
            game.state = STATE.RESULT;
        }

        postGame(game); // Export to Firebase
        cb(null, game);
    });
    
};

exports.leave = function(room, uuid, cb){
    getGame(room, function(game){
        if(!game) return;
        // Remove their player
        var player = _.findWith(game.players, {id:uuid});
        if(player){
            if(player.state != "spectating") player.state = "disconnect";
            // If only one active player left, end the round
            if(game.state == "active"){
                if(_.where(game.players, {state:'active'}).length <= 1)
                    game.state = "ended";
                else {
                    while(_.findWhere(game.players, {position:game.turn}).state != 'active'){
                        game.turn = (game.turn + game.direction) % game.players.length;
                    }
                }
            } else if(game.state == "prep") {
                // Remove players from games that haven't started
                game.players = _.without(game.players, player);
            }
            cb(null, {players: game.players, state: game.state, turn: game.turn});
        }
        // game.players = _.without(game.players, player)
    });
    
};

exports.getScores = function(){
    return _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
}

// exports.getPlayers = function(){ return players }

// exports.getPlayer = function(uuid){ return _.find(players, function(player){ return player.id == uuid })}

exports.getState = function(){ return game.state }

exports.getTitle = function(){ return game.title }

exports.getRound = function(){ return game.round }


exports.getWinner = function(){ return game.winner }

exports.getScoreboard = function(){
    return {
        title: game.title
        , scores: _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
        , players: game.players.length
    };

};

exports.reset = function(cb){
    // init()
    postGame(game); // Export to Firebase
    cb(null, game);
};

// init();

// A Debug DRAW room
drawGame = newGame("12345");
drawGame.room = "DRAW";
drawGame.state = STATE.DRAW;
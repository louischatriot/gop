/*
 * Public API
 * * goban.drawStone(color, x, y) - color can be black, white or square
 * * goban.clearIntersection(x, y)
 * * goban.clearBoard()
 *
 * No Event emitted
 */

function Goban (_opts) {
  var opts = _opts || {}
    , self = this;

  // Options
  this.size = opts.size || 19;
  this.container = opts.container || '#the-goban';
  this.gameEngine = opts.gameEngine;
  this.canPlayColor = opts.canPlayColor || 'none';

  this.$outerContainer = $(this.container);
  this.$outerContainer.addClass('goban-outer-container');
  this.$outerContainer.append('<div class="goban-container"></div>');
  this.$container = $(this.$outerContainer.find('.goban-container'));

  this.stoneSizePercent = 100 / (this.size - 1);
  this.$outerContainer.css('padding', (50 / this.size) + '%');

  // Dynamically ensure the goban is always square if width was specified as a percentage
  this.$container.height(this.$container.width());
  $(window).on('resize', function () {
    self.$container.height(self.$container.width());
  });

  // Shadow stone
  this.$container.append('<div class="shadow-stone-white"></div>');
  this.$container.append('<div class="shadow-stone-black"></div>');
  $(document).on('mousemove', function (e) { self.updateShadow(e.pageX - self.$container.offset().left, e.pageY - self.$container.offset().top); });
  $(document).on('click', function (e) { self.handleClick(e); });

  // TODO: Don't fire event if double touch
  var te;
  $(document).on('touchstart', function (e) { te = e; });
  $(document).on('touchmove', function (e) { te = e; });
  $(document).on('touchend', function (e) {
    var touch = te.originalEvent.touches[0];
    self.handleSwipe(touch.pageX - self.$container.offset().left, touch.pageY - self.$container.offset().top);
  });

  this.listeners = {};

  this.drawBoard();
}

Goban.prototype.on = function(evt, listener) {
  if (!this.listeners[evt]) { this.listeners[evt] = []; }
  this.listeners[evt].push(listener);
};

Goban.prototype.emit = function (evt, message) {
  if (this.listeners[evt]) {
    this.listeners[evt].forEach(function (fn) { fn(message); });
  }
};

Goban.dots = { '9': [{ x: 2, y: 2 }, { x: 2, y: 6 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 4, y: 4 }]
             , '13': [{ x: 3, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 3 }, { x: 9, y: 9 }, { x: 6, y: 6 }]
             , '19': [{ x: 3, y: 3 }, { x: 3, y: 9 }, { x: 3, y: 15 }, { x: 9, y: 3 }, { x: 9, y: 9 }, { x: 9, y: 15 }, { x: 15, y: 3 }, { x: 15, y: 9 }, { x: 15, y: 15 }]
             };

Goban.prototype.drawBoard = function () {
  var $line
    , self = this
    , dotSize = 1.3   // In percent of the board size
    ;

  for (var i = 1; i <= this.size; i += 1) {
    $line = $('<div></div>');
    $line.addClass('goban-line-h');
    $line.css('top', ((i - 1) * this.stoneSizePercent) + '%');
    this.$container.append($line);

    $line = $('<div></div>');
    $line.addClass('goban-line-v');
    $line.css('left', ((i - 1) * this.stoneSizePercent) + '%');
    this.$container.append($line);
  }

  if (Goban.dots[this.size]) {
    Goban.dots[this.size].forEach(function (dot) {
      var $dot = $('<div class="goban-dot"></div>');
      $dot.css('top', (dot.y * self.stoneSizePercent - (dotSize / 2)) + '%');
      $dot.css('left', (dot.x * self.stoneSizePercent - (dotSize / 2)) + '%');
      $dot.css('width', dotSize + '%');
      $dot.css('height', dotSize + '%');
      self.$container.append($dot);
    });
  }
};


Goban.prototype.drawStone = function (color, x, y, highlight) {
  var $stone = $('<div class="goban-stone-' + color + '" data-intersection="' + x + '-' + y + '"></div>');
  $stone.css('width', this.stoneSizePercent + '%');
  $stone.css('height', this.stoneSizePercent + '%');
  $stone.css('left', ((x - 0.5) * this.stoneSizePercent) + '%');
  $stone.css('top', ((y - 0.5) * this.stoneSizePercent) + '%');
  if (highlight) { $stone.append('<div class="highlight-for-' + color + '"></div>'); }
  this.$container.append($stone);
};


Goban.prototype.removeCurrentHighlight = function () {
  this.$container.find('.highlight-for-black').parent().html('');
  this.$container.find('.highlight-for-white').parent().html('');
};


Goban.prototype.drawPoint = function (color, x, y) {
  var $stone = $('<div class="point goban-stone-' + color + '" data-intersection="' + x + '-' + y + '"></div>');
  $stone.css('width', (this.stoneSizePercent / 3) + '%');
  $stone.css('height', (this.stoneSizePercent / 3) + '%');
  $stone.css('left', ((x - 0.5 + (1/3)) * this.stoneSizePercent) + '%');
  $stone.css('top', ((y - 0.5 + (1/3)) * this.stoneSizePercent) + '%');
  this.$container.append($stone);
};


Goban.prototype.clearIntersection = function (x, y) {
  this.$container.find('div[data-intersection="' + x + '-' + y + '"]').remove();
};


// Remove points and dead marks on stones
Goban.prototype.removePointsMarking = function () {
  this.$container.find('div.point').remove();
  this.$container.find('div.goban-stone-white').removeClass('dead');
  this.$container.find('div.goban-stone-black').removeClass('dead');
};


Goban.prototype.markDead = function (intersection) {
  if (intersection.x !== undefined && intersection.y !== undefined) {
    this.$container.find('div[data-intersection="' + intersection.x + '-' + intersection.y + '"]').addClass('dead');
  } else {
    for (var i = 0; i < intersection.length; i += 1) { this.markDead(intersection[i]); }
  }
};


Goban.prototype.clearBoard = function () {
  this.$container.find('div.goban-stone-white').remove();
  this.$container.find('div.goban-stone-black').remove();
  this.$container.find('div.goban-stone-square').remove();
};


Goban.prototype.userCanPlay = function () {
  return (this.gameEngine.currentPlayer === this.canPlayColor) || (this.canPlayColor === 'both');
};


Goban.prototype.updateShadow = function (x_px, y_px) {
  if (!this.gameEngine.canPlayInCurrentBranch() || !this.userCanPlay()) {
    this.$container.find('.shadow-stone-white').css('display', 'none');
    this.$container.find('.shadow-stone-black').css('display', 'none');
    return;
  }

  this.$container.find('.shadow-stone-' + this.gameEngine.getOppositePlayer()).css('display', 'none');
  var $shadowStone = this.$container.find('.shadow-stone-' + this.gameEngine.currentPlayer);
  var x = Math.floor((this.size - 1) * x_px / this.$container.width() + 0.5)
  var y = Math.floor((this.size - 1) * y_px / this.$container.height() + 0.5)

  if (x < 0 || y < 0 || x >= this.size || y >= this.size || !this.gameEngine.isMoveValid(x, y)) {
    $shadowStone.css('display', 'none');
    delete this.currentX;
    delete this.currentY;
    return;
  }

  $shadowStone.css('width', this.stoneSizePercent + '%');
  $shadowStone.css('height', this.stoneSizePercent + '%');
  $shadowStone.css('left', ((x - 0.5) * this.stoneSizePercent) + '%');
  $shadowStone.css('top', ((y - 0.5) * this.stoneSizePercent) + '%');
  $shadowStone.css('display', 'block');

  this.currentX = x;
  this.currentY = y;
};

Goban.prototype.handleClick = function (e) {
  var x_px = e.pageX - this.$container.offset().left;
  var y_px = e.pageY - this.$container.offset().top;
  var x = Math.floor((this.size - 1) * x_px / this.$container.width() + 0.5)
  var y = Math.floor((this.size - 1) * y_px / this.$container.height() + 0.5)
  if (x < 0 || y < 0 || x >= this.size || y >= this.size) { return; }
  goban.emit('intersection.clicked', { x: x, y: y });
};

Goban.prototype.handleSwipe = function (x_px, y_px) {
  var x = Math.floor((this.size - 1) * x_px / this.$container.width() + 0.5)
  var y = Math.floor((this.size - 1) * y_px / this.$container.height() + 0.5)
  if (x < 0 || y < 0 || x >= this.size || y >= this.size) { return; }
  goban.emit('intersection.clicked', { x: x, y: y });
};




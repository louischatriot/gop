var players = { WHITE: 'white', BLACK: 'black' };

function Goban (_opts) {
  var opts = _opts || {}
    , self = this;

  // Options
  this.size = opts.size || 19;
  this.container = opts.container || '#the-goban';
  this.$container = $(this.container);
  this.gobanSize = opts.gobanSize || '100%';

  this.$container.addClass('goban-container');

  // Dynamically ensure the goban is always square if width was specified as a percentage
  this.$container.css('width', this.gobanSize);
  this.$container.height(this.$container.width());
  $(window).on('resize', function () {
    self.$container.height(self.$container.width());
  });

  this.stoneSizePercent = 100 / (this.size - 1);

  // Shadow stone
  this.$container.append('<div class="shadow-stone-white"></div>');
  this.$container.append('<div class="shadow-stone-black"></div>');
  $(document).on('mousemove', function (e) { self.updateShadow(e.pageX - self.$container.offset().left, e.pageY - self.$container.offset().top); });
  $(document).on('click', function (e) { self.handleClick(); });

  this.drawBoard();
}


Goban.prototype.drawBoard = function () {
  var $line;

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
};


Goban.prototype.drawStone = function (color, x, y) {
  var $stone = $('<div class="goban-stone-' + color + '"></div>');
  $stone.css('width', this.stoneSizePercent + '%');
  $stone.css('height', this.stoneSizePercent + '%');
  $stone.css('left', ((x - 0.5) * this.stoneSizePercent) + '%');
  $stone.css('top', ((y - 0.5) * this.stoneSizePercent) + '%');
  this.$container.append($stone);
};


Goban.prototype.updateShadow = function (x_px, y_px) {
  var $shadowStone = this.$container.find('.shadow-stone-' + this.game.currentPlayer);
  var x = Math.floor((this.size - 1) * x_px / this.$container.width() + 0.5)
  var y = Math.floor((this.size - 1) * y_px / this.$container.height() + 0.5)

  if (x < 0 || y < 0 || x >= this.size || y >= this.size) {
    $shadowStone.css('display', 'none');
    this.currentX = null;
    this.currentY = null;
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

Goban.prototype.handleClick = function () {
  if (this.currentX !== null && this.currentY !== null) {
    this.game.play(this.game.currentPlayer, this.currentX, this.currentY);
    return;
  }
};





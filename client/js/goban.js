function Goban (_opts) {
  var opts = _opts || {};
  this.size = opts.size || 19;
  this.container = opts.container || '#the-goban';
  this.$container = $(this.container);
  this.pixelSize = opts.pixelSize || this.$container.width();

  this.$container.addClass('goban-container');

  this.$container.width(this.pixelSize);
  this.$container.height(this.pixelSize);

  this.stoneSize = this.pixelSize / (this.size - 1);
}


Goban.prototype.drawBoard = function () {
  var $line;

  for (var i = 1; i <= this.size; i += 1) {
    $line = $('<div></div>');
    $line.addClass('goban-line-h');  
    $line.css('top', ((i - 1) * this.pixelSize / (this.size - 1)) + 'px');
    this.$container.append($line);

    $line = $('<div></div>');
    $line.addClass('goban-line-v');  
    $line.css('left', ((i - 1) * this.pixelSize / (this.size - 1)) + 'px');
    this.$container.append($line);
  }
};


Goban.prototype.drawStone = function (color, x, y) {
  var $stone = $('<div class="goban-stone-' + color + '"></div>');
  $stone.css('width', this.stoneSize + 'px');
  $stone.css('height', this.stoneSize + 'px');
  $stone.css('left', ((x - 0.5) * this.stoneSize) + 'px');
  $stone.css('top', ((y - 0.5) * this.stoneSize) + 'px');
  this.$container.append($stone);
};



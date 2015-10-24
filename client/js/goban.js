function Goban (_opts) {
  var opts = _opts || {};
  this.size = opts.size || 19;
  this.container = opts.container || '#the-goban';
  this.$container = $(this.container);

  this.$container.addClass('goban-container');

  this.pixelSize = this.$container.width();
  this.$container.height(this.pixelSize);
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

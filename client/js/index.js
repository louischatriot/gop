var goban = new Goban({ size: 19, gobanSize: '45%' });

goban.drawBoard();
goban.drawStone('white', 1, 2);
goban.drawStone('black', 2, 2);
goban.drawStone('black', 1, 3);


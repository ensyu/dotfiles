#ドットファイルを配列に格納
dotfiles=`find $HOME/dotfiles/ -regex "^.*//\..*" -mindepth 1 -maxdepth 1`
sHome=`echo $HOME | sed -e "s/\//\\\//"`
for v in $dotfiles; do
filename=${v##*/}
echo $filename
ln -s $v $HOME/$filename
done

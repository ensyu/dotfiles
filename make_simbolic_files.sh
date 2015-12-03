#ドットファイルを配列に格納
dotfiles=`find $HOME/dotfiles/ -regex "^.*//\..*" -mindepth 1 -maxdepth 1`
#$HOMEのスラッシュをエスケープ
sHome=`echo $HOME | sed -e "s/\//\\\//"`
git=".git"
for v in $dotfiles; do
  filename=${v##*/}
  #echo $filename
  #$HOMEにシンボリックリンクを作成
  if [ $filename != $git ]; then
    if [ -e $HOME/$filename ]; then
      echo $HOME/$filename はすでにあります。
    else
      ln -s $v $HOME/$filename
    fi
  fi
done

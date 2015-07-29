#!/bin/sh
# -*- coding: utf-8-unix -*-

if [ $# -lt 2 ];then
    echo "Usage: $0 lastRevisionTag newRevision [commit message]" 1>&2
    echo "Example: $0 V0.0.6.2 V0.0.6.3 BUGFIX:count" 1>&2
    exit 2
fi

if [ $(echo $0|grep "makeRelase.sh") ];then
    cp -p "makeRelase.sh" tmp.sh
    exec ./tmp.sh $*
fi

OLD=$1
NEW=$2
MSG=$3
echo OLD=$OLD NEW=$NEW MSG=$MSG

#developでタグ打ち
git checkout develop || exit 1
git tag $NEW

#masterブランチを最新にする
git checkout master || exit 1
git pull || exit 1

#patchファイル作成
git checkout develop || exit 1
git format-patch $OLD || exit 1

#mastrerから作ったrelaseブランチにバッチ適応
git checkout master -b release$NEW || exit 1
git tag "before_am_$OLD"
for file in *.patch;do
    git am <"$file" || exit 1
done

mkdir "for$NEW"
mv -f *.patch "for$NEW"

#rebase
git -c core.editor="sed -i '2,/^$/s/^pick\b/s/'" rebase -i "before_am_$OLD" ||
    exit 1
git tag -d "before_am_$OLD"

#日付の更新
git commit --amend -m `echo "$NEW $MSG"|sed '1s/^V//'` --date=`date +%FT23:00:00` ||
    exit 1
git rebase --committer-date-is-author-date  HEAD~1 || exit 1


#masterに戻ってマージ
#git checkout master
#git merge release$NEW || exit 1
#  リポジトリにpush
#git push origin master  #githubへ
#git push origin --tags
#  developに戻る
#git checkout develop

rm -f tmp.sh

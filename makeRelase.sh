#!/bin/sh
# -*- coding: utf-8-unix -*-

if [ $# -lt 2 ];then
    echo "Usage: $0 lastRevisionTag newRevision" 1>&2
    echo "Example: $0 V0.0.6.2 V0.0.6.3" 1>&2
    exit 2
fi
OLD=$1
NEW=$2
echo OLD=$OLD NEW=$NEW

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
git commit --amend -C HEAD --date="date +%FT23:00:00" || exit 1
git rebase --committer-date-is-author-date  HEAD~1 || exit 1
git commit --amend -m `echo "$NEW"|sed '1s/^V//'`


#masterに戻ってマージ
#git checkout master
#git merge release$NEW || exit 1
#  リポジトリにpush
#git push origin master || exit1 #githubへ
#  developに戻る
#git checkout develop

# 実行環境



# 動かし方メモ

## ローカル環境の開発の仕方

### VOICEVOXの起動

`voicevox/` 以下に移動(`cd voicevox/`)
そして以下のコマンドを実行するとVOICEVOXのサーバーが立ち上げる

```
docker-compose up -d
```

または

```
docker compose up -d
```

VOICEVOXのサーバーが立ち上がったら
http://localhost:50021/docs
にアクセスすることでVOICEVOXのAPIドキュメントを参照することができます
また
http://localhost:50021/setting
にアクセスすることでCORSの設定の変更などを行うことができます

### web frontendの起動

`web/` 以下に移動(`cd web/`)
し

```
yarn install
```

を実行してライブラリのインストールを行い
そして以下のコマンドを実行するとローカルのサーバーが起動する

```
yarn run dev
```

上記の [VOICEVOXの起動](#VOICEVOXの起動) が行われていれば、問題なくweb から音声合成が行われます

# 各種使用ツールや素材一覧

* [VOICEVOX](https://voicevox.hiroshiba.jp/)
* [ずんだもんVRM](https://booth.pm/ja/items/3733351)
* 背景画像
  * [学校のグラウンド（4枚）](https://min-chi.material.jp/fm/bg_c/school_ground/)
  * [和風の家の玄関ホール（2枚）](https://min-chi.material.jp/fm/bg_c/jp_entrance_hall/)
  * [飲食店の店内（3枚）](https://min-chi.material.jp/fm/bg_c/casual_restaurant/)
* [ChatVRM 記事](https://inside.pixiv.blog/2023/04/28/160000)
* [ChatVRM Github](https://github.com/pixiv/ChatVRM)
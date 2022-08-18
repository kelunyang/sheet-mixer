<template>
  <v-app>
    <v-main>
      <v-dialog
        v-model="introW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="introW = false"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>歡迎使用併表App</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="info" icon="fa-info">如果你完全理解該怎麼匯入，請按左上角X關閉說明</v-alert>
            <p>本程式的GitHub網址： https://github.com/kelunyang/sheet-mixer ，你可以在這裡觀察看看有沒有更新檔以及原始碼</p>
            <p>本程式是用來合併大量CSV檔案使用的，使用的效果見下圖</p>
            <v-img src="@/assets/intro.png"></v-img>
            <p>本程式簡化了在excel裡面大量併表需要的vlookup流程（例如要把三張表格裡的性別合併為一欄），以及併表結束之後要分組輸出的剪貼問題，眾所皆知，自動化程度越高，就越能保持資料唯一性，減少手殘</p>
            <p>請注意在你使用之前務必把各種excel檔案都轉成CSV（建議使用unicode編碼的CSV，不過大部分情況下沒差），可看下圖</p>
            <v-img src="@/assets/csv.png"></v-img>
            <p>雖然聽起來很自動化，但請務必注意你要合併的表格，他們至少都有一欄確定無誤的用戶代號（可以是姓名、身分證等任何東西），然後再準備好一張主表（裡面要包含這些對應關係的表，例如一張記錄用戶身分證－學號－姓名的表），這樣App就能自動整併了，如果你沒聽懂，等一下打開後有範本可以看</p>
            <p>Kelunyang@LKSH 2022 (kelunyang@outlook.com)</p>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="mergeDataW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="closeMergeW"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>併表／輸出設定</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-stepper v-model="exportStep">
              <v-stepper-header>
                <v-stepper-step
                  :complete="exportStep > 1"
                  step="1"
                >
                  選擇主表併表時查表欄位順序
                </v-stepper-step>
                <v-divider></v-divider>
                <v-stepper-step
                  :complete="exportStep > 2"
                  step="2"
                >
                  選擇分組欄位
                </v-stepper-step>
              </v-stepper-header>
              <v-stepper-items>
                <v-stepper-content step="1">
                  <div class="d-flex flex-column pa-1">
                    <v-alert type="info" icon="fa-info">
                      請點選和排序主表中你需要用來查表的欄位，系統會按照你選的欄位的先後順序對副表的唯一值欄位進行反查
                    </v-alert>
                    <v-item-group mandatory multiple>
                      <draggable v-model="mergeColumns" class="d-flex flex-row pa-1">
                        <v-item v-for="column in mergeColumns" :key="column.id+'merge'">
                          <v-card
                            :color="column.active ? 'black' : 'grey lighten-1'"
                            class="d-flex align-center justify-center flex-column ma-1 flex-grow-1 flex-wrap white--text"
                            dark
                            height="100"
                            @click="selectColumn(column)"
                          >
                            <v-scroll-y-transition>
                              <div
                                v-if="column.active"
                                class="text-h2 text-center"
                              >
                                <div class="text-body-1">[已選擇]</div>
                              </div>
                            </v-scroll-y-transition>
                            <div class="text-h5">{{ column.name }}</div>
                            <div class="text-body-2">{{ tableFinder(column.table) }}</div>
                          </v-card>
                        </v-item>
                      </draggable>
                    </v-item-group>
                    <v-btn
                      color="primary"
                      @click="exportStep = 2"
                      class="ma-1"
                      :disabled="activeKey.length === 0"
                    >
                      下一步
                    </v-btn>
                  </div>
                </v-stepper-content>
                <v-stepper-content step="2">
                  <div class="d-flex flex-column pa-1">
                    <v-alert type="info" icon="fa-info">
                      如果你不要分組輸出，就直接按「開始併表」，系統會根據你選擇的欄位把查詢結果分割為多個檔案輸出，如果你選了啟動分組但沒選分組欄位，系統不會有任何動作喔
                    </v-alert>
                    <v-switch
                      v-model="enableGrouping"
                      :label="enableGrouping ? '分組輸出已啟動' : '分組輸出已關閉'"
                    ></v-switch>
                    <v-select
                      v-if='enableGrouping'
                      :items="columnSets"
                      v-model="groupingColumn"
                      item-text="name"
                      item-value="id"
                      outlined
                      label="分組欄位欄位"
                      hint="系統會以此欄位的內容分組分割輸出"
                    ></v-select>
                  </div>
                  <div class="d-flex flex-row">
                    <v-btn
                      color="primary"
                      @click="exportStep = 1"
                      class="ma-1 flex-grow-1"
                    >
                      上一步
                    </v-btn>
                    <v-btn
                      color="error"
                      @click="proceedMerge"
                      class="ma-1 flex-grow-1"
                      :disabled="!readyMerge"
                    >
                      開始併表
                    </v-btn>
                  </div>
                </v-stepper-content>
              </v-stepper-items>
            </v-stepper>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="columnChoseW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="closeColumnW"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>選擇欄位</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="info" icon="fa-info" v-if='subTables.length === 0'>
              你已經選了{{ selectedColumnSet.length }}個欄位
            </v-alert>
            <v-stepper v-model="columnStep">
              <v-stepper-header>
                <v-stepper-step
                  :complete="columnStep > 1"
                  step="1"
                >
                  選擇一組你要的欄位
                </v-stepper-step>
                <v-divider></v-divider>
                <v-stepper-step
                  :complete="columnStep > 2"
                  step="2">
                  欄位順序
                </v-stepper-step>
                <v-divider></v-divider>
                <v-stepper-step
                  :complete="columnStep > 3"
                  step="3">
                  文字處理
                </v-stepper-step>
                <v-divider></v-divider>
                <v-stepper-step
                  :complete="columnStep > 4"
                  step="4"
                >
                  你要拿這組欄位來幹嘛
                </v-stepper-step>
                <v-divider></v-divider>
                <v-stepper-step
                  step="5">
                  幫這組欄位取個名字
                </v-stepper-step>
              </v-stepper-header>

              <v-stepper-items>
                <v-stepper-content step="1">
                  <div class="d-flex flex-column pa-1">
                    <v-select
                      v-if='tables.length > 0'
                      :items="tables"
                      v-model="tableFilter"
                      item-text="name"
                      item-value="id"
                      outlined
                      label="請在此選擇表格"
                      hint="下面會列出表格對應的欄位"
                    ></v-select>
                    <v-item-group mandatory multiple>
                      <v-container>
                        <v-row>
                          <v-col
                            v-for="column in selectedColumns"
                            :key="column.id"
                            cols="12"
                            md="4"
                          >
                            <v-item>
                              <v-card
                                :color="column.active ? 'black' : 'grey lighten-1'"
                                class="d-flex align-center justify-center flex-column white--text"
                                dark
                                height="100"
                                @click="selectColumn(column)"
                              >
                                <v-scroll-y-transition>
                                  <div
                                    v-if="column.active"
                                    class="text-h2 text-center"
                                  >
                                    <div class="text-body-1">[已選擇]</div>
                                  </div>
                                </v-scroll-y-transition>
                                <div class="text-h5">{{ column.name }}</div>
                                <div class="text-body-2">{{ tableFinder(column.table) }}</div>
                              </v-card>
                            </v-item>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-item-group>
                    <div class="d-flex flex-row">
                      <v-btn
                        color="primary"
                        @click="buildActive"
                        class="ma-1 flex-grow-1"
                        :disabled="findActive.length === 0"
                      >
                        下一步
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-content>
                <v-stepper-content step="2">
                  <div class="d-flex flex-column pa-1">
                    <v-alert type="info" icon="fa-info">如果你要改變欄位的判斷順位，請拖曳欄位</v-alert>
                    <v-item-group mandatory multiple>
                      <draggable v-model="activeColumn" class="d-flex flex-row pa-1">
                        <v-item v-for="column in activeColumn" :key="column.id+'orderA'">
                          <v-card
                            color="black"
                            class="d-flex align-center justify-center flex-column ma-1 flex-grow-1 flex-wrap drag white--text"
                            dark
                            height="100"
                          >
                            <div class="text-h5">{{ column.name }}</div>
                            <div class="text-body-2">{{ tableFinder(column.table) }}</div>
                          </v-card>
                        </v-item>
                      </draggable>
                    </v-item-group>
                    <div class="d-flex flex-row">
                      <v-btn
                        color="primary"
                        @click="columnStep = 1"
                        class="ma-1 flex-grow-1"
                      >
                        上一步
                      </v-btn>
                      <v-btn
                        color="primary"
                        @click="columnStep = 3"
                        class="ma-1 flex-grow-1"
                      >
                        下一步
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-content>
                <v-stepper-content step="3">
                  <div class="d-flex flex-column pa-1">
                    <div class="text-h6">你要如何處理合併前的欄位</div>
                    <v-radio-group v-model="textMethod">
                      <v-radio label="取代（預設值選這個）" value="0"></v-radio>
                      <v-text-field
                        v-if="textMethod === '0'"
                        outlined
                        label="文字取代原則（正規表達式）"
                        placeholder="/^(|空|-)$/"
                        v-model="columnRegex"
                      ></v-text-field>
                      <div class="text-caption" v-if="textMethod === '0'">以下是常用的文字替換範本</div>
                      <div class="d-flex flex-row" v-if="textMethod === '0'">
                        <v-chip
                          class="ma-1 white--text"
                          color="black"
                          v-for="template in regexTemplates"
                          :key="template.id"
                          @click="columnRegex = template.regex"
                        >
                          {{ template.name }}
                        </v-chip>
                      </div>
                      <v-text-field
                        v-if="textMethod === '0'"
                        outlined
                        label="找到後轉換為什麼，純清除就留空"
                        placeholder=""
                        v-model="columnRegexTo"
                      ></v-text-field>
                      <v-radio label="留頭尾，遮中間" value="1"></v-radio>
                      <v-text-field
                        v-if="textMethod === '1'"
                        outlined
                        label="中間換成什麼"
                        placeholder="◯"
                        v-model="textReplacer"
                      ></v-text-field>
                      <v-radio label="自訂（請自己輸入javascript的函式，請注意你在處理的是一個陣列，可以使用lodash，參數名稱是x）" value="2"></v-radio>
                      <tip-tap v-if="textMethod === '2'" v-model="textFunction"></tip-tap>
                    </v-radio-group>
                    <div class="text-h6">合併後欄位還是沒資料，該欄位填入什麼？</div>
                    <v-text-field
                      outlined
                      label="如何處理資料為空的問題"
                      placeholder="無"
                      v-model="emptyMerge"
                    ></v-text-field>
                    <div class="d-flex flex-row">
                      <v-btn
                        color="primary"
                        @click="columnStep = 2"
                        class="ma-1 flex-grow-1"
                      >
                        上一步
                      </v-btn>
                      <v-btn
                        color="primary"
                        @click="columnStep = 4"
                        class="ma-1 flex-grow-1"
                        :disabled="textMethod === ''"
                      >
                        下一步
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-content>
                <v-stepper-content step="4">
                  <div class="d-flex flex-column pa-1">
                    <v-radio-group v-model="columnMethod">
                      <v-radio label="融合（也A欄位值為空時，拿B欄位的值去補上去，融合成新欄位，什麼都不做也選這個）" value="0"></v-radio>
                      <v-radio label="串接（也就是把aaa和bbb接成aaabbb）" value="1"></v-radio>
                      <v-text-field
                        outlined
                        label="串接連接符"
                        placeholder="|"
                        v-model="columnMixer"
                        v-if="columnMethod === '1'"
                      ></v-text-field>
                      <v-radio label="加總（取到小數後兩位）" value="2"></v-radio>
                      <v-radio label="平均（取到小數後兩位）" value="3"></v-radio>
                      <v-radio label="自訂（請自己輸入javascript的函式，請注意你在處理的是一個陣列，可以使用lodash，參數名稱是x）" value="4"></v-radio>
                      <tip-tap v-if="columnMethod === '4'" v-model="columnFunction"></tip-tap>
                    </v-radio-group>
                    <div class="d-flex flex-row">
                      <v-btn
                        color="primary"
                        @click="columnStep = 3"
                        class="ma-1 flex-grow-1"
                      >
                        上一步
                      </v-btn>
                      <v-btn
                        color="primary"
                        @click="columnStep = 5"
                        class="ma-1 flex-grow-1"
                        :disabled="columnMethod === ''"
                      >
                        下一步
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-content>
                <v-stepper-content step="5">
                  <div class="d-flex flex-column pa-1">
                    <v-text-field
                      label="欄位名稱"
                      placeholder="欄位名稱"
                      v-model="columnName"
                      outlined
                    ></v-text-field>
                    <div class="d-flex flex-row">
                      <v-btn
                        color="primary"
                        @click="columnStep = 4"
                        class="ma-1 flex-grow-1"
                      >
                        上一步
                      </v-btn>
                      <v-btn
                        color="primary"
                        @click="saveColumn"
                        class="ma-1 flex-grow-1"
                        :disabled="columnName === ''"
                      >
                        存檔
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-content>
              </v-stepper-items>
            </v-stepper>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="subTableW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="closeSubW"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>選擇副表CSV檔案</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="info" icon="fa-info" v-if="importSubCount > 0">已讀入{{ importSubCount }}個表格，如果要增加新的請點下面的讀入檔案欄位</v-alert>
            <v-alert type="info" icon="fa-info" v-if='subTables.length === 0'>
              副表檔案為CSV檔案，請注意，副表中必須有用戶的唯一值，不然之後無法合併
            </v-alert>
            <v-alert type="info" icon="fa-info" v-if='proceedData.length > 0'>一共讀入了{{ proceedData.length }}行資料</v-alert>
            <v-alert type="error" icon="fa-skull" v-if='subError !== ""'>{{ subError }}</v-alert>
            <v-simple-table v-if='subTables.length > 0'>
              <template v-slot:default>
                <thead>
                  <tr>
                    <th
                      class="text-center"
                    >
                      已讀入副表名稱
                    </th>
                    <th
                      class="text-center"
                    >
                      讀入時間
                    </th>
                    <th
                      class="text-center"
                    >
                      有效資料數量
                    </th>
                    <th
                      class="text-center"
                    >
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="table in subTables"
                    :key="table.id"
                  >
                    <td>{{ table.name }}</td>
                    <td>{{ dateConvert(table.tick) }}</td>
                    <td>{{ table.data.length }}</td>
                    <td>
                      <v-btn color="error" @click="removeSub(table)">刪除</v-btn>
                    </td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
            <v-btn class='ma-1 indigo darken-4 white--text' @click="downloadCSV(sampleSub, '副表範例')" v-if='subTables.length === 0'>下載範例檔</v-btn>
            <v-file-input accept="text/csv" prepend-icon='fa-file-csv' outlined v-model="subFile" placeholder="請選擇副表CSV檔案"/>
            <v-select
              v-if='proceedColumn.length > 0'
              :items="proceedColumn"
              v-model="subUniq"
              item-text="name"
              item-value="id"
              outlined
              label="唯一值欄位"
              hint="系統會以此過濾掉副表名單重複值，並且以此欄位反查主表之後進行併表"
            ></v-select>
            <v-btn class='ma-1 indigo darken-4 white--text' @click="importSub()" :disabled="subUniq === ''">讀入副表</v-btn>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="logW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="logW = false"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>查看工作紀錄</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-simple-table v-if='descLog.length > 0'>
              <template v-slot:default>
                <thead>
                  <tr>
                    <th
                      class="text-center"
                    >
                      類型
                    </th>
                    <th
                      class="text-center"
                    >
                      時間
                    </th>
                    <th
                      class="text-center"
                    >
                      表格
                    </th>
                    <th
                      class="text-center"
                    >
                      訊息
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="log in descLog"
                    :key="log.id"
                  >
                    <td>{{ log.type === "error" ? "錯誤" : "訊息" }}</td>
                    <td>{{ dateConvert(log.tick) }}</td>
                    <td>{{ tableFinder(log.table) }}</td>
                    <td>{{ log.msg }}</td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="mainPeopleW"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar
            dark
            color="primary"
          >
            <v-btn
              icon
              dark
              @click="buildMain"
            >
              <v-icon>fa-times-circle</v-icon>
            </v-btn>
            <v-toolbar-title>選擇主表CSV檔案</v-toolbar-title>
          </v-toolbar>
          <v-card-text class='d-flex flex-column ma-1'>
            <v-alert type="info" icon="fa-info" v-if='mainCount === 0'>
              主表檔案為CSV檔案，請注意，主表中應該要有（也建議只要有）用戶的唯一值即可（可參考範本）
            </v-alert>
            <v-alert type="info" icon="fa-info" v-if='proceedData.length > 0'>一共讀入了{{ proceedData.length }}行資料</v-alert>
            <v-alert type="error" icon="fa-skull" v-if='mainError !== ""'>{{ mainError }}</v-alert>
            <v-btn class='ma-1 indigo darken-4 white--text' @click="downloadCSV(sampleMain, '主表範例')">下載範例檔</v-btn>
            <v-file-input accept="text/csv" prepend-icon='fa-file-csv' outlined v-model="mainFile" placeholder="請選擇主表CSV檔案"/>
            <v-select
              v-if='mainHeaders.length > 0'
              :items="mainHeaders"
              v-model="mainUniq"
              item-text="name"
              item-value="id"
              outlined
              label="唯一值欄位"
              hint="系統會以此過濾掉主表名單重複值"
            ></v-select>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-row>
        <v-col class='d-flex blue darken-4 justify-space-between flex-column align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>主表人數</div>
          <div class='text-h4 white--text ma-1 text-center'>{{ mainCount }}</div>
          <v-btn @click="mainPeopleW = true" class='red darken-4 white--text ma-1'>{{ mainCount > 0 ? '重建' : '讀入' }}主表</v-btn>
        </v-col>
        <v-col class='d-flex blue darken-4 justify-space-between flex-column align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>副表數量</div>
          <div class='text-h4 white--text text-center'>{{ subTables.length }}</div>
          <v-btn @click="subTableW = true" class='red darken-4 white--text ma-1'>新增副表</v-btn>
        </v-col>
        <v-col class='d-flex blue darken-4 justify-space-between flex-column align-content-space-between'>
          <div class='text-caption white--text ma-1 text-left'>欄位組合</div>
          <div class='text-h4 white--text text-center'>{{ columnSets.length }}</div>
          <v-btn class="ma-1 red darken-4 white--text" @click="openColumnW" :disabled="tables.length === 0">新增欄位組合</v-btn>
        </v-col>
        <v-col class='blue darken-4 flex-column d-flex'>
          <v-btn class="ma-1 red darken-4 white--text" @click="selectKeys" :disabled="!readyMerge">開始併表</v-btn>
          <v-btn class="ma-1 red darken-4 white--text" @click="exportResult" :disabled="exportData.length === 0">匯出清單</v-btn>
          <v-btn class="ma-1 red darken-4 white--text" @click="logW = true" :disabled="log.length === 0">查看紀錄({{ log.length }})</v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col class="d-flex flex-column pt-0">
          <v-alert type="info" icon="fa-info" v-if='showLog'>
            [{{ dateConvert(lastLog.tick) }}] {{ tableFinder(lastLog.table) }}/{{ lastLog.msg }}
          </v-alert>
          <v-alert type="info" icon="fa-info" v-if='hoverAlert'>
            如果你要改變欄位輸出順序，或者是改變欄位組內部的排序／融合順序，拖曳就對了
          </v-alert>
          <draggable v-model="columnSets" handle=".handle" @mouseover="hoverAlert = true" @mouseout="hoverAlert = false">
            <div v-for="columnSet in columnSets" :key="columnSet.id" class="d-flex flex-column ma-1 columnCard">
              <div class="pa-1 d-flex flex-row">
                <div class='handle flex-grow-1 pa-1'>
                  [{{ methodConvert(columnSet.method) }}/{{ textConvert(columnSet.text) }}]{{columnSet.name}}
                </div>
                <v-btn class="flex-shrink-1" @click="removeSet(columnSet)">刪除</v-btn>
              </div>
              <draggable v-model="columnSet.set" handle=".handle" direction="horizontal" class="d-flex flex-row ma-1 flex-wrap">
                <div class="flex-grow-1 handle pa-1 columnInside ma-1" v-for="column in columnSet.set" :key="'drag' + column.id" @mouseover="hoverAlert = true" @mouseout="hoverAlert = false">
                  {{ tableFinder(column.table) }}\{{ column.name }}
                </div>
              </draggable>
            </div>
          </draggable>
        </v-col>
      </v-row>
    </v-main>
  </v-app>
</template>
<style>
.drag {
  cursor: move;
}
html {
  scroll-behavior: smooth;
}
.handle {
  background-color: #FFF;
  color: #000;
}
.handle:hover {
  cursor:move;
  background-color: #333;
  color: #FFF
}
.columnCard {
  border: 1px solid #CCC;
  filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3));
}
.columnInside {
  border: 1px solid #000;
  border-bottom: 3px solid #000;
}
</style>
<script>
import JSZip from 'jszip';
import draggable from 'vuedraggable'
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import '@fortawesome/fontawesome-free/css/all.css';
import '@fortawesome/fontawesome-free/js/all.js';
import iconv from 'iconv-lite';
import chardet from 'chardet';
import dayjs from 'dayjs';
import TipTap from './components/TipTap.vue'

export default {
  name: 'App',
  components: {
    TipTap,
    draggable
  },
  computed: {
    findActive: function() {
      return _.filter(this.columnMapping, (column) => {
        return column.active;
      });
    },
    selectedColumns: function() {
      let oriobj = this;
      let selecteds = _.filter(this.columnMapping, (column) => {
        return column.active;
      });
      let tableColumns = _.filter(this.columnMapping, (column) => {
        return column.table === oriobj.tableFilter;
      });
      let output = _.unionWith(selecteds, tableColumns, (s, t) => {
        return s.id === t.id;
      })
      output = _.orderBy(output, ['order'], ['asc']);
      return output;
    },
    showLog: function() {
      if(this.hoverAlert) {
        return false;
      } else {
        if(this.lastLog !== "") {
          return true;
        }
      }
      return false;
    },
    activeKey: function() {
      return _.filter(this.columnMapping, (column) => {
        if(column.table === "main") {
          return column.active;
        }
        return false;
      });
    },
    mainCount: function() {
      let main = _.filter(this.tables, (table) => {
        return table.id === "main";
      });
      return main[0].data.length;
    },
    subTables: function() {
      let subTables = _.filter(this.tables, (table) => {
        return table.id !== "main";
      });
      return _.orderBy(subTables, ["tick"], ["desc"]);
    },
    descLog: function() {
      return _.orderBy(this.log, ["tick"], ["desc"]);
    },
    lastLog: function() {
      if(this.log.length > 0) {
        let msg = _.orderBy(this.log, ["tick"], ["desc"]);
        return msg[0];
      }
      return "";
    },
    subError: function() {
      let errors = _.filter(this.log, (log) => {
        if(log.table !== "main") {
          return log.type === "error";
        }
        return false;
      });
      if(errors.length > 0) {
        errors = _.orderBy(errors, ["tick"], ["desc"]);
        return errors[0];
      }
      return "";
    },
    mainError: function() {
      let errors = _.filter(this.log, (log) => {
        if(log.table === "main") {
          return log.type === "error";
        }
        return false;
      });
      if(errors.length > 0) {
        errors = _.orderBy(errors, ["tick"], ["desc"]);
        return errors[0];
      }
      return "";
    },
    mainHeaders: function() {
      return _.filter(this.columnMapping, (column) => {
        return column.table === "main";
      })
    }
  },
  mounted: function() {
    let oriobj = this;
    window.ipcRenderer.receive('mergeStatus', (args) => {
      oriobj.log.push({
        table: "sys",
        type: "msg",
        msg: "合併作業訊息：" + args.data,
        tick: args.tick,
        id: uuidv4()
      });
    });
    window.ipcRenderer.receive('mergeResult', (args) => {
      oriobj.exportData = args.data;
      oriobj.log.push({
        table: "sys",
        type: "msg",
        msg: "合併完成，準備輸出的資料表有[" + args.data.length + "]張",
        tick: args.tick,
        id: uuidv4()
      });
      oriobj.readyMerge = true;
    });
  },
  methods: {
    closeMergeW: function() {
      this.mergeDataW = false;
      this.exportStep = 1;
      this.enableGrouping = false;
      this.groupingColumn = '';
    },
    buildActive: function() {
      this.activeColumn = this.findActive;
      this.columnStep = 2;
    },
    removeSet: function(Rset) {
      this.columnSets = _.filter(this.columnSets, (set) => {
        return set.id !== Rset.id;
      });
      if(this.columnSets.length === 0) {
        this.readyMerge = false;
      }
    },
    proceedMerge: function() {
      let proceed = false;
      if(this.readyMerge) {
        if(!this.enableGrouping) {
          proceed = true;
        } else {
          if(this.groupingColumn !== "") {
            proceed = true;
          }
        }
      }
      if(proceed) {
        window.ipcRenderer.send("mergeData", {
          grouping: this.enableGrouping,
          groupingColumn: this.groupingColumn,
          cellDB: this.cellDB,
          columnDB: this.columnMapping,
          setDB: this.columnSets,
          tableDB: this.tables,
          uidDB: _.filter(this.mergeColumns, (column) => { return column.active; })
        });
        this.readyMerge = false;
        this.closeMergeW();
      }
    },
    selectKeys: function() {
      this.mergeColumns = this.mainHeaders;
      for(let i=0; i<this.mergeColumns.length; i++) {
        this.mergeColumns[i].active = false;
      }
      this.mergeDataW = true;
    },
    selectColumn: function(column) {
      column.active = !column.active;
    },
    methodConvert: function(type) {
      if(type === "0") return "融合";
      if(type === "1") return "串接";
      if(type === "2") return "加總";
      if(type === "3") return "平均";
      if(type === "4") return "自訂";
    },
    textConvert: function(type) {
      if(type === "0") return "取代";
      if(type === "1") return "遮罩";
      if(type === "2") return "自訂";
    },
    openColumnW: function() {
      for(let i=0;i<this.columnMapping.length;i++) {
        this.columnMapping[i].active = false;
      }
      let main = _.filter(this.tables, (table) => {
        return table.id === "main";
      });
      if(main.length > 0) {
        this.columnMapping[0].active = true;
        this.tableFilter = main[0].id;
        this.columnChoseW = true;
      }
    },
    closeColumnW: function() {
      this.columnMixer = "|";
      this.columnName = "";
      this.columnRegex = "/^(|空|-)$/";
      this.columnRegexTo = "";
      this.textMethod = "";
      this.textReplacer = "◯";
      this.emptyMerge = "無";
      this.textFunction = "<pre><code class='language-javascript'>return x === '1' ? '男' : '女';</code></pre>";
      this.columnFunction = "<pre><code class='language-javascript'>function(x) { return x }</code></pre>";
      this.columnMethod = "";
      this.columnStep = 1;
      this.selectedColumnSet = [];
      this.tableFilter = "";
      this.columnChoseW = false;
    },
    saveColumn: function() {
      let syntax = "";
      let textSyntax = "";
      if(this.columnMethod !== '4') {
        this.columnFunction = "";
      } else {
        syntax = this.columnFunction.replace(/<pre><code class='language-javascript'>/, '');
        syntax = syntax.replace(/<\/code><\/pre>/, '');
      }
      if(this.textMethod !== '2') {
        this.textFunction = "";
      } else {
        textSyntax = this.textFunction.replace(/<pre><code class='language-javascript'>/, '');
        textSyntax = textSyntax.replace(/<\/code><\/pre>/, '');
      }
      this.columnSets.push({
        id: uuidv4(),
        set: this.activeColumn,
        regexTest: this.columnRegex,
        regexResult: this.columnRegexTo,
        name: this.columnName,
        function: syntax,
        method: this.columnMethod,
        mixer: this.columnMixer,
        text: this.textMethod,
        replacer: this.textReplacer,
        textFunction: textSyntax,
        emptyMerge: this.emptyMerge
      });
      this.log.push({
        table: "sys",
        type: "msg",
        msg: "增加了一個欄位組，內有[" + this.activeColumn.length +"]個欄位",
        tick: dayjs().valueOf(),
        id: uuidv4()
      });
      this.readyMerge = true;
      this.activeColumn = [];
      this.closeColumnW();
    },
    closeSubW: function() {
      this.log.push({
        table: "sys",
        type: "msg",
        msg: "本次匯入了[" + this.importSubCount + "]個副表",
        tick: dayjs().valueOf(),
        id: uuidv4()
      });
      this.subTableW = false;
      this.subFile = undefined;
      this.proceedColumn = [];
      this.proceedData = [];
      this.importSubCount = 0;
    },
    removeSub: function(del) {
      this.tables = _.filter(this.tables, (table) => {
        return table.id !== del.id;
      });
      this.cellDB = _.filter(this.cellDB, (cell) => {
        return cell.table !== del.id;
      });
      this.columnMapping = _.filter(this.columnMapping, (column) => {
        return column.table !== del.id;
      });
    },
    importSub: function() {
      this.uniqTable(1);
      this.importSubCount++;
      this.subUniq = "";
    },
    tableFinder: function(query) {
      if(query === "sys") {
        return "系統";
      } else {
        let table = _.filter(this.tables, (table) => {
          return table.id === query
        });
        if(table.length > 0) {
          return table[0].name;
        }
        return "";
      }
    },
    dateConvert: function(tick) {
      return (dayjs(tick)).format("YYYY-MM-DD HH:mm:ss");
    },
    buildMain: function() {
      this.uniqTable(0);
      this.mainPeopleW = false;
    },
    uniqTable: function(type) {
      let now = dayjs().valueOf();
      if(type === 0) {
        let uniq = _.filter(this.columnMapping, (column) => {
          if(column.table === "main") {
            return column.uniqle;
          }
          return false;
        })
        let oriLength = this.proceedData.length;
        this.proceedData = _.uniqBy(this.proceedData, (main) => {
          return main[uniq[0].count];
        });
        let newLength = this.proceedData.length;
        for(let i=0; i<this.proceedData.length; i++) {
          for(let k=0; k<this.mainHeaders.length; k++) {
            this.cellDB.push({
              table: "main",
              column: this.mainHeaders[k].id,
              uid: this.proceedData[i][uniq[0].count].trim(),
              value: this.proceedData[i][k],
              id: uuidv4()
            })
          }
        }
        let main = _.filter(this.tables, (table) => {
          return table.id === "main";
        });
        main[0].tick = now;
        main[0].data = _.map(this.proceedData, (row) => {
          return row[uniq[0].count].trim();
        });
        this.proceedData = [];
        this.mainFile = undefined;
        this.log.push({
          table: "main",
          type: "msg",
          msg: "過濾完成，原始個數為[" + oriLength +"]，過濾後為[" + newLength + "]",
          tick: now,
          id: uuidv4()
        });
      } else {
        let uniq = _.filter(this.proceedColumn, (column) => {
          return column.uniqle;
        });
        let oriLength = this.proceedData.length;
        this.mainData = _.uniqBy(this.proceedData, (sub) => {
          return sub[uniq[0].count];
        });
        let newLength = this.proceedData.length;
        for(let i=0; i<this.proceedData.length; i++) {
          for(let k=0; k<this.proceedColumn.length; k++) {
            this.cellDB.push({
              table: this.subID,
              column: this.proceedColumn[k].id,
              uid: this.proceedData[i][uniq[0].count].trim(),
              value: this.proceedData[i][k],
              id: uuidv4()
            })
          }
        }
        this.tables.push({
          id: this.subID,
          name: this.subName,
          tick: now,
          data:  _.map(this.proceedData, (row) => {
            return row[uniq[0].count].trim();
          })
        });
        for(let i=0; i<this.proceedColumn.length; i++) {
          this.columnMapping.push({
            id: this.proceedColumn[i].id,
            name: this.proceedColumn[i].name,
            table: this.proceedColumn[i].table,
            uniqle: this.proceedColumn[i].uniqle,
            active: false,
            order: this.columnMapping.length
          });
        }
        this.proceedColumn = [];
        this.proceedData = [];
        this.log.push({
          table: this.subID,
          type: "msg",
          msg: "過濾完成，原始個數為[" + oriLength +"]，過濾後為[" + newLength + "]",
          tick: now,
          id: uuidv4()
        });
        this.subID = "";
        this.subMainq = "";
        this.subName = "";
        this.subFile = undefined;
      }
    },
    downloadCSV: function(arr, filename) {
      let output = "\ufeff"+ Papa.unparse(arr);
      let blob = new Blob([output], { type: 'text/csv' });
      let url = window.URL.createObjectURL(blob);
      let element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', filename + ".csv");
      element.click();
    },
    exportResult: function() {
      let zip = new JSZip();
      for(let i=0; i<this.exportData.length; i++) {
        let output = "\ufeff"+ Papa.unparse(this.exportData[i].content);
        zip.file(this.exportData[i].name+".csv", output);
      }
      zip.generateAsync({type:"blob"})
      .then(function (blob) {
        let url = window.URL.createObjectURL(blob);
        let element = document.createElement('a');
        element.setAttribute('href', url);
        element.setAttribute('download', "輸出結果.zip");
        element.click();
      });
    },
  },
  watch: {
    mainUniq: function() {
      let uniqField = _.filter(this.columnMapping, (column) => {
        return column.table === "main";
      });
      for(let i=0; i<uniqField.length; i++) {
        if(uniqField[i].id === this.mainUniq) {
          uniqField[i].uniqle = true;
        } else {
          uniqField[i].uniqle = false;
        }
      }
    },
    subUniq: function() {
      for(let i=0; i<this.proceedColumn.length; i++) {
        if(this.proceedColumn[i].id === this.subUniq) {
          this.proceedColumn[i].uniqle = true;
        } else {
          this.proceedColumn[i].uniqle = false;
        }
      }
    },
    mainFile: {
      immediate: true,
      async handler () {
        let oriobj = this;
        if (this.mainFile !== undefined) {
          let reader = new FileReader();
          reader.readAsArrayBuffer(oriobj.mainFile);
          reader.onload = ((file) => {
            try {
              let result = Buffer.from(file.target.result);
              let encoding = chardet.detect(result);
              let content = iconv.decode(Buffer.from(file.target.result), encoding);
              Papa.parse(content, {
                header: false,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    let headers = result.data[0];
                    oriobj.columnMapping = _.filter(oriobj.columnMapping, (column) => {
                      return column.table !== "main";
                    });
                    for(let i=0; i<headers.length; i++) {
                      oriobj.columnMapping.push({
                        id: uuidv4(),
                        name: headers[i],
                        table: "main",
                        uniqle: false,
                        active: false,
                        count: i,
                        order: oriobj.columnMapping.length
                      });
                    }
                    result.data.shift();
                    oriobj.proceedData = result.data;
                  }
                }
              });
            } catch(e) {
              oriobj.log.push({
                table: "main",
                type: "error",
                msg: e.message,
                tick: dayjs().valueOf(),
                id: uuidv4()
              });
            }
          });
        }
      }
    },
    subFile: {
      immediate: true,
      async handler () {
        let oriobj = this;
        if (this.subFile !== undefined) {
          let reader = new FileReader();
          reader.readAsArrayBuffer(oriobj.subFile);
          reader.onload = ((file) => {
            try {
              let name = oriobj.subFile.name;
              let result = Buffer.from(file.target.result);
              let encoding = chardet.detect(result);
              let content = iconv.decode(Buffer.from(file.target.result), encoding);
              Papa.parse(content, {
                header: false,
                skipEmptyLines: true,
                complete: async function(result) {
                  if(result.data.length > 0) {
                    oriobj.subName = name;
                    oriobj.subID = uuidv4();
                    let headers = result.data[0];
                    oriobj.columnMapping = _.filter(oriobj.columnMapping, (column) => {
                      return column.table !== oriobj.subID;
                    });
                    for(let i=0; i<headers.length; i++) {
                      oriobj.proceedColumn.push({
                        id: uuidv4(),
                        name: headers[i],
                        table: oriobj.subID,
                        uniqle: false,
                        count: i
                      });
                    }
                    result.data.shift();
                    oriobj.proceedData = result.data;
                  }
                }
              });
            } catch(e) {
              oriobj.log.push({
                table: oriobj.subID,
                type: "error",
                msg: e.message,
                tick: dayjs().valueOf(),
                id: uuidv4()
              });
            }
          });
        }
      }
    },
  },
  data: () => ({
    emptyMerge: "無",
    introW: true,
    regexTemplates: [
      {
        id: "na",
        name: "Excel找不到的NA",
        regex: "/^(#N\\/A)$/"  /* eslint-disable-line */
      },
      {
        id: "empty",
        name: "各種空值（-、空、純空格）",
        regex: "/^(|空|-)$/"
      }
    ],
    textMethod: "",
    textReplacer: "◯",
    textFunction: "<pre><code class='language-javascript'>return x === '男' ? '1' : '2';</code></pre>",
    exportStep: 1,
    enableGrouping: false,
    activeColumn: [],
    tableFilter: "",
    readyMerge: false,
    mergeColumns: [],
    mergeDataW: false,
    cellDB: [],
    hoverAlert: false,
    columnMixer: "|",
    columnName: "",
    columnRegexTo: "",
    columnRegex: "/^(|空|-)$/",
    columnFunction: "<pre><code class='language-javascript'>return _.toString(x);</code></pre>",
    columnMethod: "",
    columnStep: 1,
    selectedColumnSet: [],
    columnSets: [],
    importSubCount: 0,
    subID: "",
    subFile: undefined,
    subUniq: "",
    subName: "",
    mainUniq: "",
    tables: [{
      id: "main",
      name: "主表",
      tick: 0,
      data: []
    }],
    proceedColumn: [],
    columnMapping: [],
    mainFile: undefined,
    proceedData: [],
    exportData: [],
    groupingColumn: "",
    columnChoseW: false,
    subTableW: false,
    mainPeopleW: false,
    logW: false,
    log: [],
    sampleMain: [{
      "身分證": "A123456789",
      "姓名": "諸葛村夫",
      "學號": "S0000001"
    },
    {
      "身分證": "A123456790",
      "姓名": "劉大耳",
      "學號": "S0000002"
    },
    {
      "身分證": "A123456791",
      "姓名": "2D",
      "學號": "S0000003"
    }],
    sampleSub: [{
      "身分證": "A123456789",
      "職業": "軍師"
    },{
      "身分證": "A123456789",
      "職業": "臥龍先生"
    }]
  }),
};
</script>

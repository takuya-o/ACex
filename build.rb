#!/usr/bin/env ruby
# -*- coding: utf-8-unix -*-

require 'rubygems'
require 'crxmake'

# CrxMake.make(
#   :ex_dir => "./src",
#   :pkey   => "./ACex-crxmake.pem",
# #  :key_output => "./acex.pem",
#   :crx_output => "./acex.crx",
#   :verbose => true,
#   :ignorefile => /(\.swp|.*~|.ts)/,
#   :ignoredir => /\.(?:svn|git|cvs)/
# )

CrxMake.zip(
  :ex_dir => "./src",
  :pkey   => "./src.pem",
  :zip_output => "./acex.zip",
  :verbose => true,
  :ignorefile => /(\.swp|.*~|\.ts|\.map)/,
  :ignoredir => /\.(?:svn|git|cvs|AppleDouble)/
)

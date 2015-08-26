#!/usr/bin/env ruby
# -*- coding: utf-8-unix -*-

require 'rubygems'
require 'crxmake'

CrxMake.make(
  :ex_dir => "./src",
  :pkey   => "./ACex-crxmake.pem",
  :crx_output => "./ACex.crx",
  :verbose => true,
  :ignorefile => /(\.swp|.*~)/,
  :ignoredir => /\.(?:svn|git|cvs)/
)

CrxMake.zip(
  :ex_dir => "./src",
  :pkey   => "./ACex.pem",
  :zip_output => "./ACex.zip",
  :verbose => true,
  :ignorefile => /(\.swp|.*~)/,
  :ignoredir => /\.(?:svn|git|cvs)/
)

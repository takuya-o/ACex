#!/usr/bin/env ruby
# -*- coding utf-8 -*-

require 'rubygems'
require 'crxmake'

#CrxMake.zip(

CrxMake.make(
  :ex_dir => "./src",
  :pkey   => "./ACex.pem",
  :crx_output => "./ACex.crx",
  :verbose => true,
  :ignorefile => /\.swp/,
  :ignoredir => /\.(?:svn|git|cvs)/
)

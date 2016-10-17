# ipfsmon
Monitor for any changes in your web application and automatically rehash file or directory and post to ipfs for distributed serverless hosting

ipfsmon provides you with a retrievable file version history, like git with automatic commits

# install 

OSX
install homebrew
~~~
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
~~~
then
~~~
brew install ipfs
npm install -g ipfsmon
~~~



# usage
~~~
ipfsmon <absolute or relative path to file or directory>
~~~
options: 

